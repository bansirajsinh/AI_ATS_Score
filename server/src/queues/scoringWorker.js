const { Worker } = require('bullmq');
const env = require('../config/env');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { detectSections } = require('../services/parsing/sectionDetector');
const { calculateParseabilityScore } = require('../services/scoring/parseabilityScore');
const { calculateFormattingScore } = require('../services/scoring/formattingScore');
const { calculateContentQualityScore } = require('../services/scoring/contentQualityScore');
const { calculateKeywordMatchScore } = require('../services/scoring/keywordMatchScore');
const { aggregateScores } = require('../services/scoring/scoreAggregator');
const { analyzeResumeContent, extractJdKeywords } = require('../services/ai/llmClient');
const { embedBatch } = require('../services/ai/embeddingClient');
const { extractBullets } = require('../services/parsing/sectionDetector');

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

const worker = new Worker('resume-scoring', async (job) => {
  const { resumeId, jobId } = job.data;

  logger.info({ resumeId, jobId, jobName: job.id }, 'Scoring job started');

  try {
    // Update status to processing
    await prisma.score.update({
      where: { id: job.data.scoreId },
      data: { status: 'processing' },
    });

    // 1. Fetch resume
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new Error(`Resume ${resumeId} not found`);
    }

    // 2. Fetch JD if provided
    let jd = null;
    let jdKeywords = null;
    if (jobId) {
      jd = await prisma.jobDescription.findUnique({
        where: { id: jobId },
      });

      if (jd) {
        // Use cached keywords or extract new ones
        if (jd.extractedKeywords && Object.keys(jd.extractedKeywords).length > 0) {
          jdKeywords = jd.extractedKeywords;
        } else {
          jdKeywords = await extractJdKeywords(jd.rawText);
          // Cache the extracted keywords
          await prisma.jobDescription.update({
            where: { id: jobId },
            data: { extractedKeywords: jdKeywords },
          });
        }
      }
    }

    // 3. Detect sections
    const sectionData = detectSections(resume.rawText);
    const { sections } = sectionData;

    // 4. Run AI content analysis (if API key configured)
    await job.updateProgress(30);
    const aiAnalysis = await analyzeResumeContent(resume.rawText, jd?.rawText || '');

    // 5. Generate embeddings for resume sections (if API key configured)
    await job.updateProgress(50);
    const sectionTexts = [];
    const sectionKeys = [];

    for (const [key, text] of Object.entries(sections)) {
      if (text && text.length > 20) {
        // Split experience into individual bullets
        if (key === 'experience') {
          const bullets = extractBullets(text);
          for (let i = 0; i < bullets.length; i++) {
            sectionTexts.push(bullets[i]);
            sectionKeys.push(`experience_bullet_${i}`);
          }
        }
        sectionTexts.push(text);
        sectionKeys.push(key);
      }
    }

    const embeddings = await embedBatch(sectionTexts, `resume:${resume.fileHash}`);

    // Store embeddings in DB (batch insert)
    if (embeddings.some((e) => e.embedding)) {
      // Delete old embeddings for this resume
      await prisma.resumeEmbedding.deleteMany({ where: { resumeId } });

      // Batch insert new ones using raw SQL for the vector type
      for (let i = 0; i < embeddings.length; i++) {
        if (embeddings[i].embedding) {
          const vectorStr = `[${embeddings[i].embedding.join(',')}]`;
          await prisma.$executeRawUnsafe(`
            INSERT INTO resume_embeddings (id, resume_id, section, content, embedding)
            VALUES (gen_random_uuid(), $1, $2, $3, $4::vector)
          `, resumeId, sectionKeys[i], sectionTexts[i].slice(0, 2000), vectorStr);
        }
      }
    }

    // 6. Calculate all sub-scores
    await job.updateProgress(70);

    const parseabilityResult = calculateParseabilityScore(
      resume.rawText,
      sections,
      { parseError: resume.sections?.parseError, mimeType: resume.mimeType }
    );

    const formattingResult = calculateFormattingScore(
      resume.rawText,
      { mimeType: resume.mimeType }
    );

    const contentResult = calculateContentQualityScore(
      resume.rawText,
      sections,
      aiAnalysis
    );

    const keywordResult = await calculateKeywordMatchScore(
      resume.rawText,
      resumeId,
      jdKeywords
    );

    // 7. Aggregate
    await job.updateProgress(90);
    const aggregated = aggregateScores({
      parseability: parseabilityResult.score,
      keywordMatch: keywordResult.score,
      contentQuality: contentResult.score,
      formatting: formattingResult.score,
    });

    // 8. Build the full report
    const report = {
      overall: aggregated.overall,
      band: aggregated.band,
      bandColor: aggregated.bandColor,
      breakdown: aggregated.breakdown,
      parseability: parseabilityResult,
      formatting: formattingResult,
      contentQuality: contentResult,
      keywordMatch: keywordResult,
      aiAnalysis: aiAnalysis || null,
      sections: sectionData,
    };

    // Build prioritized issues list (top 5 highest impact)
    const allIssues = [
      ...parseabilityResult.issues.map((i) => ({ ...i, category: 'parseability' })),
      ...formattingResult.issues.map((i) => ({ ...i, category: 'formatting' })),
      ...contentResult.issues.map((i) => ({ ...i, category: 'contentQuality' })),
      ...keywordResult.issues.map((i) => ({ ...i, category: 'keywordMatch' })),
    ].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    });

    report.prioritizedIssues = allIssues.slice(0, 5);
    report.allIssues = allIssues;

    // 9. Save score to DB
    await prisma.score.update({
      where: { id: job.data.scoreId },
      data: {
        overallScore: aggregated.overall,
        parseabilityScore: parseabilityResult.score,
        keywordScore: keywordResult.score,
        contentScore: contentResult.score,
        formattingScore: formattingResult.score,
        report,
        status: 'completed',
      },
    });

    // 10. Save keyword matches
    if (keywordResult.matches && keywordResult.matches.length > 0) {
      await prisma.keywordMatch.createMany({
        data: keywordResult.matches.map((m) => ({
          scoreId: job.data.scoreId,
          keyword: m.keyword,
          matchType: m.matchType,
          similarity: m.similarity,
          resumeSection: m.resumeSection,
          suggestedPlacement: m.suggestedPlacement,
        })),
      });
    }

    await job.updateProgress(100);
    logger.info({
      resumeId,
      overallScore: aggregated.overall,
      band: aggregated.band,
    }, 'Scoring job completed');

    return { scoreId: job.data.scoreId, overall: aggregated.overall };
  } catch (err) {
    logger.error({ err, resumeId }, 'Scoring job failed');

    // Update score status to failed
    try {
      await prisma.score.update({
        where: { id: job.data.scoreId },
        data: {
          status: 'failed',
          errorMessage: err.message,
        },
      });
    } catch (updateErr) {
      logger.error({ err: updateErr }, 'Failed to update score status');
    }

    throw err;
  }
}, {
  connection,
  concurrency: 3,
  limiter: {
    max: 5,
    duration: 60000,
  },
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Worker job failed');
});

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Worker job completed');
});

module.exports = worker;