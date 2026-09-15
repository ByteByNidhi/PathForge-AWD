const express = require('express');
const {
  listLearningPaths,
  getLearningPath,
  getLearningPathSkills,
  selectLearningPath,
  getLearningPathRoadmap,
  completeLearningPathStep,
} = require('../controllers/learningPathController');
const { protect, requireOnboardingComplete } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listLearningPaths);
router.get('/:id/skills', protect, getLearningPathSkills);
router.get('/:id/roadmap', protect, requireOnboardingComplete, getLearningPathRoadmap);
router.post('/:id/select', protect, requireOnboardingComplete, selectLearningPath);
router.post(
  '/:pathId/steps/:stepId/complete',
  protect,
  requireOnboardingComplete,
  completeLearningPathStep
);
router.get('/:id', protect, getLearningPath);

module.exports = router;
