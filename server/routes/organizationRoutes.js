const express = require('express');
const { protect } = require('../middleware/auth');
const { requireOrganization, requireOrganizationOwner } = require('../middleware/organization');
const organizationController = require('../controllers/organizationController');

const router = express.Router();
const orgAccess = [protect, requireOrganization];
const ownerAccess = [...orgAccess, requireOrganizationOwner];

router.get('/', ...orgAccess, organizationController.getDashboard);
router.get('/profile', ...orgAccess, organizationController.getProfile);
router.put('/profile', ...ownerAccess, organizationController.updateProfile);
router.patch('/profile', ...ownerAccess, organizationController.updateProfile);

router.get('/members', ...orgAccess, organizationController.listMembers);
router.post('/members', ...ownerAccess, organizationController.addMember);
router.put('/members/:userId', ...ownerAccess, organizationController.updateMember);
router.patch('/members/:userId', ...ownerAccess, organizationController.updateMember);
router.delete('/members/:userId', ...ownerAccess, organizationController.removeMember);

router.get('/opportunities', ...orgAccess, organizationController.listOpportunities);
router.post('/opportunities', ...ownerAccess, organizationController.createOpportunity);
router.get('/opportunities/:id', ...orgAccess, organizationController.getOpportunity);
router.put('/opportunities/:id', ...ownerAccess, organizationController.updateOpportunity);
router.patch('/opportunities/:id', ...ownerAccess, organizationController.updateOpportunity);
router.post('/opportunities/:id/submit', ...ownerAccess, organizationController.submitOpportunity);
router.delete('/opportunities/:id', ...ownerAccess, organizationController.deleteOpportunity);

module.exports = router;
