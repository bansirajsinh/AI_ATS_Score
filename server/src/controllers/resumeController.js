const crypto = require('crypto');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { parsePdf } = require('../services/parsing/pdfParser');
const { parseDocx } = require('../services/parsing/docxParser');
const { detectSections } = require('../services/parsing/sectionDetector');
const { uploadFile, deleteFile } = require('../services/storage/s3Client');

async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'NO_FILE', 'No file uploaded. Please select a PDF, DOCX, or TXT file.');
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Parse file content
    let parseResult;
    if (mimetype === 'application/pdf') {
      parseResult = await parsePdf(buffer);
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      parseResult = await parseDocx(buffer);
    } else if (mimetype === 'text/plain') {
      parseResult = { text: buffer.toString('utf-8') };
    } else {
      throw new AppError(415, 'UNSUPPORTED_TYPE', 'Only PDF, DOCX, and TXT files are accepted.');
    }

    const rawText = parseResult.text || '';

    if (!rawText || rawText.length < 10) {
      // Still save but flag the issue
      logger.warn({ fileName: originalname }, 'Resume has very little extractable text');
    }

    // Hash file content for deduplication/caching
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Store file
    const fileUrl = await uploadFile(buffer, originalname, mimetype);

    // Detect sections
    const sectionData = detectSections(rawText);

    // Determine version (check for existing resumes by same user with same hash)
    let version = 1;
    if (req.user) {
      const existing = await prisma.resume.findFirst({
        where: { userId: req.user.id, fileHash },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      if (existing) {
        version = existing.version + 1;
      }
    }

    // Save to database
    const resume = await prisma.resume.create({
      data: {
        userId: req.user?.id || null,
        rawText,
        fileName: originalname,
        fileUrl,
        fileHash,
        fileSize: size,
        mimeType: mimetype,
        version,
        sections: {
          ...sectionData,
          parseError: parseResult.error || null,
          pageCount: parseResult.pageCount || null,
        },
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        version: true,
        createdAt: true,
      },
    });

    logger.info({
      resumeId: resume.id,
      fileName: originalname,
      textLength: rawText.length,
      sectionCount: sectionData.sectionOrder.length,
    }, 'Resume uploaded and parsed');

    res.status(201).json({
      success: true,
      data: {
        resume,
        parsing: {
          textLength: rawText.length,
          sectionsDetected: sectionData.sectionOrder,
          hasStandardHeaders: sectionData.hasStandardHeaders,
          parseError: parseResult.error || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getResume(req, res, next) {
  try {
    const { id } = req.params;

    const resume = await prisma.resume.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        version: true,
        createdAt: true,
        sections: true,
        userId: true,
      },
    });

    if (!resume) {
      throw new AppError(404, 'RESUME_NOT_FOUND', 'Resume not found');
    }

    // Check ownership if authenticated
    if (req.user && resume.userId && resume.userId !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resume');
    }

    res.json({ success: true, data: { resume } });
  } catch (err) {
    next(err);
  }
}

async function listResumes(req, res, next) {
  try {
    const { page, limit } = req.validated || { page: 1, limit: 20 };
    const skip = (page - 1) * limit;

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          version: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.resume.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      success: true,
      data: {
        resumes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteResume(req, res, next) {
  try {
    const { id } = req.params;

    const resume = await prisma.resume.findUnique({
      where: { id },
      select: { id: true, userId: true, fileUrl: true },
    });

    if (!resume) {
      throw new AppError(404, 'RESUME_NOT_FOUND', 'Resume not found');
    }

    if (resume.userId !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resume');
    }

    // Delete file from storage
    if (resume.fileUrl) {
      await deleteFile(resume.fileUrl);
    }

    // Cascade delete handles scores, embeddings, keyword_matches
    await prisma.resume.delete({ where: { id } });

    logger.info({ resumeId: id }, 'Resume deleted');

    res.json({ success: true, data: { message: 'Resume deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadResume, getResume, listResumes, deleteResume };