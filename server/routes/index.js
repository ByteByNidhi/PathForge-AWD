const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const skillRoutes = require('./skillRoutes');
const learningPathRoutes = require('./learningPathRoutes');
const onboardingRoutes = require('./onboardingRoutes');
const achievementRoutes = require('./achievementRoutes');
const opportunityRoutes = require('./opportunityRoutes');
const organizationRoutes = require('./organizationRoutes');
const adminRoutes = require('./adminRoutes');
const aiStudioRoutes = require('./aiStudioRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/skills', skillRoutes);
router.use('/learning-paths', learningPathRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/achievements', achievementRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/organization', organizationRoutes);
router.use('/admin', adminRoutes);
router.use('/ai-studio', aiStudioRoutes);

module.exports = router;
