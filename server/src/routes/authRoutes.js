const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, signupSchema, loginSchema } = require('../utils/validators');

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/profile', auth, getProfile);

module.exports = router;