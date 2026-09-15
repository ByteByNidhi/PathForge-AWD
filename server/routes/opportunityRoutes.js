const express = require('express');
const {
  listOpportunities,
  listSavedOpportunities,
  getOpportunity,
  saveOpportunity,
  unsaveOpportunity,
} = require('../controllers/opportunityController');
const { protect, requireOnboardingComplete } = require('../middleware/auth');
const { rejectOrganizationMembersFromStudentApis } = require('../middleware/organization');

const router = express.Router();
const gated = [protect, rejectOrganizationMembersFromStudentApis, requireOnboardingComplete];

router.get('/', ...gated, listOpportunities);
router.get('/saved', ...gated, listSavedOpportunities);
router.post('/:id/save', ...gated, saveOpportunity);
router.delete('/:id/save', ...gated, unsaveOpportunity);
router.get('/:id', ...gated, getOpportunity);

module.exports = router;
