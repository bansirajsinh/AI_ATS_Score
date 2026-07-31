const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('./errorHandler');

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required. Please provide a valid Bearer token.');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Token is missing');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    if (err.isOperational) {
      return next(err);
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please log in again.'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError(401, 'INVALID_TOKEN', 'Invalid authentication token'));
    }
    return next(new AppError(401, 'AUTH_ERROR', 'Authentication failed'));
  }
}

/**
 * Optional auth — attaches user if token present, continues without if not.
 * Used for endpoints that work both with and without auth (e.g., anonymous first scan).
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  // If a token IS provided, validate it normally
  return auth(req, res, next);
}

module.exports = { auth, optionalAuth };