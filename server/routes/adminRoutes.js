const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();
const adminAccess = [protect, requireAdmin];

router.use(...adminAccess);

router.get('/', adminController.getDashboard);

router.get('/opportunities', adminController.listOpportunities);
router.post('/opportunities', adminController.createOpportunity);
router.post('/opportunities/himalayas/fetch', adminController.fetchHimalayasOpportunities);
router.get('/opportunities/:id', adminController.getOpportunity);
router.put('/opportunities/:id', adminController.updateOpportunity);
router.patch('/opportunities/:id', adminController.updateOpportunity);
router.post('/opportunities/:id/approve', adminController.approveOpportunity);
router.post('/opportunities/:id/reject', adminController.rejectOpportunity);
router.delete('/opportunities/:id', adminController.deleteOpportunity);

router.get('/organizations', adminController.listOrganizations);
router.post('/organizations', adminController.createOrganization);

router.get('/career-path-requests', adminController.listCareerPathRequests);
router.post('/career-path-requests/review', adminController.reviewCareerPathRequests);

router.get('/roadmaps', adminController.listRoadmaps);
router.get('/roadmaps/:pathId', adminController.getRoadmap);
router.post('/roadmaps/:pathId/generate', adminController.generateRoadmap);
router.get('/roadmaps/:pathId/preview', adminController.previewRoadmap);
router.post('/roadmaps/:pathId/publish', adminController.publishRoadmap);
router.post('/roadmaps/:pathId/steps', adminController.createRoadmapStep);
router.put('/roadmaps/:pathId/steps/:stepId', adminController.updateRoadmapStep);
router.patch('/roadmaps/:pathId/steps/:stepId', adminController.updateRoadmapStep);
router.delete('/roadmaps/:pathId/steps/:stepId', adminController.deleteRoadmapStep);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);

router.get('/subscriptions', adminController.listSubscriptions);
router.get('/subscriptions/:id', adminController.getSubscription);
router.post('/subscriptions/:id/upgrade', adminController.upgradeSubscription);

module.exports = router;
