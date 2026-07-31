const logger = require('../utils/logger');

class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Log the full error internally
  logger.error({
    err,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
  }, err.message);

  // Operational errors we created intentionally
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Multer errors (file too large, wrong type, etc.)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 5MB limit',
      },
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNEXPECTED_FILE_FIELD',
        message: 'Unexpected file field name in upload',
      },
    });
  }

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  }

  // Zod / validation errors that slip through
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.issues,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      },
    });
  }

  // Unknown / unhandled errors — never leak internal details
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}

module.exports = { errorHandler, AppError };