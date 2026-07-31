const prisma = require('../config/db');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { enqueueScoringJob } = require('../queues/scoringQueue');

async function createScore(req, res, next) {
  try {
    const { resumeId, jobId } = req.validated;

    // Verify resume exists
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true },
    });

    if (!resume) {
      throw new AppError(404, 'RESUME_NOT_FOUND', 'Resume not found');
    }

    // Verify JD exists if provided
    if (jobId) {
      const jd = await prisma.jobDescription.findUnique({
        where: { id: jobId },
        select: { id: true },
      });
      if (!jd) {
        throw new AppError(404, 'JD_NOT_FOUND', 'Job description not found');
      }
    }

    // Create a score record in pending state
    const score = await prisma.score.create({
      data: {
        resumeId,
        jobId: jobId || null,
        status: 'pending',
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Enqueue scoring job
    const job = await enqueueScoringJob(resumeId, jobId);

    // Update the BullMQ job data with scoreId so the worker knows where to write results
    await job.updateData({ ...job.data, scoreId: score.id });

    logger.info({ scoreId: score.id, resumeId, jobId, bullJobId: job.id }, 'Scoring job enqueued');

    res.status(202).json({
      success: true,
      data: {
        scoreJobId: score.id,
        status: 'pending',
        message: 'Scoring job queued. Poll GET /api/scores/:scoreJobId for results.',
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getScore(req, res, next) {
  try {
    const { scoreJobId } = req.params;

    const score = await prisma.score.findUnique({
      where: { id: scoreJobId },
      include: {
        keywordMatches: true,
        resume: {
          select: { id: true, fileName: true, version: true },
        },
        jobDescription: {
          select: { id: true, rawText: true },
        },
      },
    });

    if (!score) {
      throw new AppError(404, 'SCORE_NOT_FOUND', 'Score result not found');
    }

    res.json({
      success: true,
      data: { score },
    });
  } catch (err) {
    next(err);
  }
}

async function getResumeHistory(req, res, next) {
  try {
    const { id: resumeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Verify resume exists and belongs to user
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true },
    });

    if (!resume) {
      throw new AppError(404, 'RESUME_NOT_FOUND', 'Resume not found');
    }

    if (req.user && resume.userId && resume.userId !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resume');
    }

    const [scores, total] = await Promise.all([
      prisma.score.findMany({
        where: { resumeId, status: 'completed' },
        select: {
          id: true,
          overallScore: true,
          parseabilityScore: true,
          keywordScore: true,
          contentScore: true,
          formattingScore: true,
          status: true,
          createdAt: true,
          jobDescription: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.score.count({
        where: { resumeId, status: 'completed' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        scores,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createScore, getScore, getResumeHistory };