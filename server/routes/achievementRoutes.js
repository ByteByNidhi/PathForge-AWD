const express = require('express');
const { listAchievements } = require('../controllers/achievementController');
const { protect, requireOnboardingComplete } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requireOnboardingComplete, listAchievements);

module.exports = router;
