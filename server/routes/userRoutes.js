const express = require('express');
const { getProfile, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, getProfile);
router.patch('/me', protect, updateProfile);

module.exports = router;
