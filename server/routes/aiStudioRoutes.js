const express = require('express');
const { protect, requireOnboardingComplete, requireNotOrganization } = require('../middleware/auth');
const aiStudioController = require('../controllers/aiStudioController');

const router = express.Router();

router.use(protect, requireNotOrganization, requireOnboardingComplete);

router.get('/', aiStudioController.getStudio);
router.post('/chat', aiStudioController.chat);

module.exports = router;
