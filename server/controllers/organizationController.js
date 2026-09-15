const asyncHandler = require('../utils/asyncHandler');
const { serializeOrganization } = require('../services/organizationAccess');
const organizationService = require('../services/organizationService');
const organizationOpportunityService = require('../services/organizationOpportunityService');

const getDashboard = asyncHandler(async (req, res) => {
  const payload = await organizationService.dashboard(req.organization, req.organizationMembership);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    organization: serializeOrganization(req.organization),
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateProfile(
    req.organization,
    req.organizationMembership,
    req.body
  );
  res.status(200).json({
    success: true,
    message: 'Organization profile updated.',
    organization,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const listMembers = asyncHandler(async (req, res) => {
  const members = await organizationService.listMembers(req.organization);
  res.status(200).json({
    success: true,
    members,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const addMember = asyncHandler(async (req, res) => {
  const members = await organizationService.addMember(
    req.organization,
    req.organizationMembership,
    req.body
  );
  res.status(201).json({
    success: true,
    message: 'Member added.',
    members,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const updateMember = asyncHandler(async (req, res) => {
  const members = await organizationService.updateMember(
    req.organization,
    req.organizationMembership,
    req.params.userId,
    req.body
  );
  res.status(200).json({
    success: true,
    message: 'Member role updated.',
    members,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const removeMember = asyncHandler(async (req, res) => {
  const members = await organizationService.removeMember(
    req.organization,
    req.organizationMembership,
    req.params.userId
  );
  res.status(200).json({
    success: true,
    message: 'Member removed.',
    members,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const listOpportunities = asyncHandler(async (req, res) => {
  const payload = await organizationOpportunityService.listForOrganization(
    req.organization,
    req.organizationMembership
  );
  res.status(200).json({
    success: true,
    ...payload,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const createOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await organizationOpportunityService.createForOrganization(
    req.user,
    req.organization,
    req.organizationMembership,
    req.body
  );
  const message =
    opportunity.approvalStatus === 'pending'
      ? 'Opportunity submitted for admin review.'
      : 'Draft opportunity saved.';
  res.status(201).json({
    success: true,
    message,
    opportunity,
  });
});

const getOpportunity = asyncHandler(async (req, res) => {
  const payload = await organizationOpportunityService.getForOrganization(
    req.organization,
    req.organizationMembership,
    req.params.id
  );
  res.status(200).json({
    success: true,
    ...payload,
    permissions: organizationService.permissions(req.organizationMembership),
  });
});

const updateOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await organizationOpportunityService.updateForOrganization(
    req.organization,
    req.organizationMembership,
    req.params.id,
    req.body
  );
  const message =
    req.body.intent === 'submit'
      ? 'Opportunity submitted for admin review.'
      : 'Opportunity updated.';
  res.status(200).json({
    success: true,
    message,
    opportunity,
  });
});

const submitOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await organizationOpportunityService.submitForOrganization(
    req.organization,
    req.organizationMembership,
    req.params.id
  );
  res.status(200).json({
    success: true,
    message: 'Opportunity submitted for admin review.',
    opportunity,
  });
});

const deleteOpportunity = asyncHandler(async (req, res) => {
  await organizationOpportunityService.deleteForOrganization(
    req.organization,
    req.organizationMembership,
    req.params.id
  );
  res.status(200).json({
    success: true,
    message: 'Draft opportunity deleted.',
  });
});

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  listMembers,
  addMember,
  updateMember,
  removeMember,
  listOpportunities,
  createOpportunity,
  getOpportunity,
  updateOpportunity,
  submitOpportunity,
  deleteOpportunity,
};
