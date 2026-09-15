const asyncHandler = require('../utils/asyncHandler');
const adminOpportunityService = require('../services/adminOpportunityService');
const adminOrganizationService = require('../services/adminOrganizationService');
const adminCareerPathRequestService = require('../services/adminCareerPathRequestService');
const opportunityImportService = require('../services/opportunityImportService');

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
};
