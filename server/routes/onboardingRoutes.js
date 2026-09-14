const express = require('express');
const { getOnboarding, completeOnboarding } = require('../controllers/onboardingController');
const { protect, requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requireRoles('student'), getOnboarding);
router.post('/complete', protect, requireRoles('student'), completeOnboarding);

module.exports = router;
