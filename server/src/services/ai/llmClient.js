const Anthropic = require('@anthropic-ai/sdk');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const {
  RESUME_ANALYSIS_SYSTEM_PROMPT,
  RESUME_ANALYSIS_USER_PROMPT,
  JD_KEYWORD_EXTRACTION_SYSTEM_PROMPT,
  JD_KEYWORD_EXTRACTION_USER_PROMPT,
} = require('./promptTemplates');
const { resumeAnalysisSchema, jdKeywordExtractionSchema } = require('./responseSchemas');

let client = null;

function getClient() {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      return null;
    }
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Calls Claude with retry + exponential backoff (max 2 retries).
 * Returns parsed JSON or null on failure.
 */
async function callWithRetry(systemPrompt, userPrompt, maxRetries = 2) {
  const anthropic = getClient();
  if (!anthropic) {
    logger.warn('Anthropic API key not configured — skipping LLM call');
    return null;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const latency = Date.now() - startTime;
      const usage = response.usage || {};

      logger.info({
        latency,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        attempt,
      }, 'LLM call completed');

      const text = response.content.find((b) => b.type === 'text')?.text || '{}';

      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in LLM response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      lastError = err;
      logger.warn({ err: err.message, attempt }, 'LLM call failed, retrying...');

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error({ err: lastError }, 'LLM call failed after all retries');
  return null;
}

/**
 * Analyze resume content using Claude.
 * Returns validated result or a degraded-state default.
 */
async function analyzeResumeContent(resumeText, jdText = '') {
  const userPrompt = RESUME_ANALYSIS_USER_PROMPT(
    resumeText.slice(0, 8000), // Cap input to ~4000 tokens
    jdText ? jdText.slice(0, 4000) : ''
  );

  const raw = await callWithRetry(RESUME_ANALYSIS_SYSTEM_PROMPT, userPrompt);

  if (!raw) {
    // Graceful degradation — return empty but valid structure
    return resumeAnalysisSchema.parse({});
  }

  try {
    return resumeAnalysisSchema.parse(raw);
  } catch (err) {
    logger.warn({ err: err.message }, 'LLM response failed schema validation, using defaults');
    return resumeAnalysisSchema.parse({});
  }
}

/**
 * Extract keywords from a job description using Claude.
 * Returns validated result or degraded-state default.
 */
async function extractJdKeywords(jdText) {
  const userPrompt = JD_KEYWORD_EXTRACTION_USER_PROMPT(jdText.slice(0, 6000));

  const raw = await callWithRetry(JD_KEYWORD_EXTRACTION_SYSTEM_PROMPT, userPrompt);

  if (!raw) {
    return jdKeywordExtractionSchema.parse({});
  }

  try {
    return jdKeywordExtractionSchema.parse(raw);
  } catch (err) {
    logger.warn({ err: err.message }, 'JD extraction response failed validation, using defaults');
    return jdKeywordExtractionSchema.parse({});
  }
}

module.exports = { analyzeResumeContent, extractJdKeywords };