const prisma = require('../config/db');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

async function createJob(req, res, next) {
  try {
    const { rawText, sourceUrl } = req.validated;

    const jd = await prisma.jobDescription.create({
      data: {
        userId: req.user?.id || null,
        rawText,
        sourceUrl: sourceUrl || null,
      },
      select: { id: true, createdAt: true },
    });

    logger.info({ jobId: jd.id, textLength: rawText.length }, 'Job description saved');

    res.status(201).json({
      success: true,
      data: { jobDescription: jd },
    });
  } catch (err) {
    next(err);
  }
}

async function getJob(req, res, next) {
  try {
    const { id } = req.params;

    const jd = await prisma.jobDescription.findUnique({
      where: { id },
      select: {
        id: true,
        rawText: true,
        sourceUrl: true,
        extractedKeywords: true,
        createdAt: true,
      },
    });

    if (!jd) {
      throw new AppError(404, 'JD_NOT_FOUND', 'Job description not found');
    }

    res.json({ success: true, data: { jobDescription: jd } });
  } catch (err) {
    next(err);
  }
}

async function listJobs(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.jobDescription.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          sourceUrl: true,
          createdAt: true,
          rawText: false,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.jobDescription.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createJob, getJob, listJobs };