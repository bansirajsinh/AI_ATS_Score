const express = require('express');
const router = express.Router();
const { uploadResume, getResume, listResumes, deleteResume } = require('../controllers/resumeController');
const { auth, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { scoringLimiter } = require('../middleware/rateLimiter');
const { validate, paginationSchema } = require('../utils/validators');

// Upload — accepts anonymous or authenticated users
router.post('/upload', scoringLimiter, optionalAuth, upload.single('resume'), uploadResume);

// Get a single resume (optional auth — allows anonymous access if no userId set)
router.get('/:id', optionalAuth, getResume);

// List user's resumes (requires auth)
router.get('/', auth, validate(paginationSchema, 'query'), listResumes);

// Delete a resume (requires auth + ownership)
router.delete('/:id', auth, deleteResume);

module.exports = router;