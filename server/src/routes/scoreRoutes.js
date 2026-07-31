const express = require('express');
const router = express.Router();
const { createScore, getScore, getResumeHistory } = require('../controllers/scoreController');
const { optionalAuth } = require('../middleware/auth');
const { scoringLimiter } = require('../middleware/rateLimiter');
const { validate, scoreRequestSchema } = require('../utils/validators');

// Kick off scoring job (async, returns scoreJobId)
router.post('/', scoringLimiter, optionalAuth, validate(scoreRequestSchema), createScore);

// Poll/get score result
router.get('/:scoreJobId', optionalAuth, getScore);

// Get score history for a resume
router.get('/resume/:id/history', optionalAuth, getResumeHistory);

module.exports = router;