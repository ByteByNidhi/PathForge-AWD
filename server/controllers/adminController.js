const asyncHandler = require('../utils/asyncHandler');
const adminOpportunityService = require('../services/adminOpportunityService');
const adminOrganizationService = require('../services/adminOrganizationService');
const adminCareerPathRequestService = require('../services/adminCareerPathRequestService');
const opportunityImportService = require('../services/opportunityImportService');
const adminRoadmapService = require('../services/adminRoadmapService');
const adminUserService = require('../services/adminUserService');
const demoSubscriptionCatalog = require('../services/demoSubscriptionCatalog');
const AppError = require('../utils/AppError');

const getDashboard = asyncHandler(async (_req, res) => {
  const payload = await adminOpportunityService.dashboard();
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const listOpportunities = asyncHandler(async (req, res) => {
  const payload = await adminOpportunityService.list(req.query);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const getOpportunity = asyncHandler(async (req, res) => {
  const payload = await adminOpportunityService.getById(req.params.id);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const fetchHimalayasOpportunities = asyncHandler(async (req, res) => {
  const result = await opportunityImportService.importFromAdminRequest(req.body);
  res.status(200).json({
    success: true,
    ...result,
  });
});

const createOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await adminOpportunityService.create(req.body);
  res.status(201).json({
    success: true,
    message: 'Opportunity created.',
    opportunity,
  });
});

const updateOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await adminOpportunityService.update(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Opportunity updated.',
    opportunity,
  });
});

const approveOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await adminOpportunityService.approve(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Opportunity approved.',
    opportunity,
  });
});

const rejectOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await adminOpportunityService.reject(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Opportunity rejected.',
    opportunity,
  });
});

const deleteOpportunity = asyncHandler(async (req, res) => {
  await adminOpportunityService.destroy(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Opportunity deleted.',
  });
});

const listOrganizations = asyncHandler(async (_req, res) => {
  const payload = await adminOrganizationService.list();
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const createOrganization = asyncHandler(async (req, res) => {
  const payload = await adminOrganizationService.create(req.body);
  res.status(201).json({
    success: true,
    message: 'Organization and owner account created. They can log in with the owner email.',
    ...payload,
  });
});

const listCareerPathRequests = asyncHandler(async (_req, res) => {
  const payload = await adminCareerPathRequestService.list();
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const reviewCareerPathRequests = asyncHandler(async (req, res) => {
  const payload = await adminCareerPathRequestService.markReviewed(req.body);
  res.status(200).json({
    success: true,
    message: 'Marked as reviewed.',
    ...payload,
  });
});

const listRoadmaps = asyncHandler(async (_req, res) => {
  const payload = await adminRoadmapService.list();
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const createRoadmap = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.create(req.body);
  res.status(201).json({
    success: true,
    ...payload,
  });
});

const getRoadmap = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.show(req.params.pathId);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const generateRoadmap = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.generate(req.params.pathId, req.body);
  res.status(200).json({
    success: true,
    message: 'AI draft generated. Review it before publishing. Users cannot see this draft.',
    ...payload,
  });
});

const previewRoadmap = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.preview(req.params.pathId);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const publishRoadmap = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.publish(req.params.pathId);
  res.status(200).json({
    success: true,
    message: 'AI roadmap published. Users can now see these steps.',
    ...payload,
  });
});

const createRoadmapStep = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.storeStep(req.params.pathId, req.body);
  res.status(201).json({
    success: true,
    ...payload,
  });
});

const updateRoadmapStep = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.updateStep(req.params.pathId, req.params.stepId, req.body);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const moveRoadmapStep = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.moveStep(req.params.pathId, req.params.stepId, req.body);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const deleteRoadmapStep = asyncHandler(async (req, res) => {
  const payload = await adminRoadmapService.destroyStep(req.params.pathId, req.params.stepId);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const listUsers = asyncHandler(async (_req, res) => {
  const payload = await adminUserService.list();
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const getUser = asyncHandler(async (req, res) => {
  const payload = await adminUserService.show(req.params.id);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const listSubscriptions = asyncHandler(async (_req, res) => {
  res.status(200).json({
    success: true,
    demo: true,
    summary: demoSubscriptionCatalog.summary(),
    subscriptions: demoSubscriptionCatalog.all(),
  });
});

const getSubscription = asyncHandler(async (req, res) => {
  const subscription = demoSubscriptionCatalog.find(req.params.id);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }
  res.status(200).json({
    success: true,
    demo: true,
    subscription,
  });
});

const upgradeSubscription = asyncHandler(async (req, res) => {
  const subscription = demoSubscriptionCatalog.find(req.params.id);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }
  res.status(200).json({
    success: true,
    demo: true,
    message: 'Upgrade Plan is a demonstration control only. No payment was processed.',
    subscription,
  });
});

module.exports = {
  getDashboard,
  listOpportunities,
  getOpportunity,
  fetchHimalayasOpportunities,
  createOpportunity,
  updateOpportunity,
  approveOpportunity,
  rejectOpportunity,
  deleteOpportunity,
  listOrganizations,
  createOrganization,
  listCareerPathRequests,
  reviewCareerPathRequests,
  listRoadmaps,
  createRoadmap,
  getRoadmap,
  generateRoadmap,
  previewRoadmap,
  publishRoadmap,
  createRoadmapStep,
  updateRoadmapStep,
  moveRoadmapStep,
  deleteRoadmapStep,
  listUsers,
  getUser,
  listSubscriptions,
  getSubscription,
  upgradeSubscription,
};
