const express = require('express');
const {
  listSkills,
  listRelevantSkills,
  listMySkills,
  assignMySkills,
  removeMySkill,
} = require('../controllers/skillController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listSkills);
router.get('/relevant', protect, listRelevantSkills);
router.get('/me', protect, listMySkills);
router.post('/me', protect, assignMySkills);
router.delete('/me/:skillId', protect, removeMySkill);

module.exports = router;
