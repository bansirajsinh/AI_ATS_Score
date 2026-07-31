const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const resumeRoutes = require('./resumeRoutes');
const scoreRoutes = require('./scoreRoutes');

// Job description routes (inline for simplicity — small surface)
const { createJob, getJob, listJobs } = require('../controllers/jobController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate, jobDescriptionSchema } = require('../utils/validators');

router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/scores', scoreRoutes);

// Job description endpoints
router.post('/jobs', optionalAuth, validate(jobDescriptionSchema), createJob);
router.get('/jobs/:id', optionalAuth, getJob);
router.get('/jobs', auth, listJobs);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

module.exports = router;