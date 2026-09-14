const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const skillRoutes = require('./skillRoutes');
const learningPathRoutes = require('./learningPathRoutes');
const onboardingRoutes = require('./onboardingRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/skills', skillRoutes);
router.use('/learning-paths', learningPathRoutes);
router.use('/onboarding', onboardingRoutes);

module.exports = router;
