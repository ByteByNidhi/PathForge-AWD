const express = require('express');
const {
  listLearningPaths,
  getLearningPath,
  getLearningPathSkills,
} = require('../controllers/learningPathController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listLearningPaths);
router.get('/:id', protect, getLearningPath);
router.get('/:id/skills', protect, getLearningPathSkills);

module.exports = router;
