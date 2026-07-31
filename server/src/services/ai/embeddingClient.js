const OpenAI = require('openai');
const crypto = require('crypto');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const redis = require('../../config/redis');

let client = null;

function getClient() {
  if (!client) {
    if (!env.OPENAI_API_KEY) {
      return null;
    }
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Hash text content for caching — same text always produces same hash.
 */
function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Embed a single text string, with Redis caching.
 * Returns a float array (1536 dimensions) or null on failure.
 */
async function embedText(text, cachePrefix = 'emb') {
  if (!text || text.trim().length === 0) return null;

  const openai = getClient();
  if (!openai) {
    logger.warn('OpenAI API key not configured — skipping embedding');
    return null;
  }

  // Check cache first
  const textHash = hashText(text);
  const cacheKey = `${cachePrefix}:${textHash}`;

  try {
    await redis.connect().catch(() => {}); // Ensure connected
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, 'Embedding cache hit');
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.debug({ err: err.message }, 'Redis cache check failed, proceeding without cache');
  }

  // Call OpenAI with retry
  let lastError = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const startTime = Date.now();

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Cap input
      });

      const latency = Date.now() - startTime;
      logger.info({ latency, attempt, textLength: text.length }, 'Embedding call completed');

      const embedding = response.data[0].embedding;

      // Cache in Redis (TTL: 7 days)
      try {
        await redis.set(cacheKey, JSON.stringify(embedding), 'EX', 7 * 24 * 60 * 60);
      } catch (err) {
        logger.debug({ err: err.message }, 'Failed to cache embedding in Redis');
      }

      return embedding;
    } catch (err) {
      lastError = err;
      logger.warn({ err: err.message, attempt }, 'Embedding call failed, retrying...');
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  logger.error({ err: lastError }, 'Embedding failed after all retries');
  return null;
}

/**
 * Batch embed multiple texts. More efficient than one-by-one for resume sections.
 * Returns array of { text, embedding } objects.
 */
async function embedBatch(texts, cachePrefix = 'emb') {
  if (!texts || texts.length === 0) return [];

  const openai = getClient();
  if (!openai) {
    logger.warn('OpenAI API key not configured — skipping batch embedding');
    return texts.map((t) => ({ text: t, embedding: null }));
  }

  const results = [];
  const uncachedTexts = [];
  const uncachedIndices = [];

  // Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const textHash = hashText(texts[i]);
    const cacheKey = `${cachePrefix}:${textHash}`;

    try {
      await redis.connect().catch(() => {});
      const cached = await redis.get(cacheKey);
      if (cached) {
        results[i] = { text: texts[i], embedding: JSON.parse(cached) };
        continue;
      }
    } catch (err) {
      // Cache miss, proceed
    }

    uncachedTexts.push(texts[i].slice(0, 8000));
    uncachedIndices.push(i);
    results[i] = null; // Placeholder
  }

  if (uncachedTexts.length === 0) {
    return results;
  }

  // Batch API call with retry
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const startTime = Date.now();

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: uncachedTexts,
      });

      const latency = Date.now() - startTime;
      logger.info({
        latency,
        batchSize: uncachedTexts.length,
        attempt,
      }, 'Batch embedding completed');

      for (let j = 0; j < response.data.length; j++) {
        const idx = uncachedIndices[j];
        const embedding = response.data[j].embedding;
        results[idx] = { text: texts[idx], embedding };

        // Cache each result
        try {
          const textHash = hashText(texts[idx]);
          await redis.set(`${cachePrefix}:${textHash}`, JSON.stringify(embedding), 'EX', 7 * 24 * 60 * 60);
        } catch (err) {
          // Non-critical
        }
      }

      break; // Success
    } catch (err) {
      logger.warn({ err: err.message, attempt }, 'Batch embedding failed, retrying...');
      if (attempt === 2) {
        // Fill remaining with nulls
        for (const idx of uncachedIndices) {
          if (!results[idx]) {
            results[idx] = { text: texts[idx], embedding: null };
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return results;
}

module.exports = { embedText, embedBatch, hashText };