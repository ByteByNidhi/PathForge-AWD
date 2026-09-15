const Opportunity = require('../models/Opportunity');
const { belongsToOrganization, isOwner } = require('./organizationAccess');

function canView(membership, organization, opportunity) {
  return Boolean(membership && belongsToOrganization(opportunity, organization));
}

function canUpdate(membership, organization, opportunity) {
  if (!isOwner(membership) || !belongsToOrganization(opportunity, organization)) {
    return false;
  }
  return (
    opportunity.approvalStatus === Opportunity.APPROVAL_DRAFT ||
    opportunity.approvalStatus === Opportunity.APPROVAL_PENDING ||
    opportunity.approvalStatus === Opportunity.APPROVAL_REJECTED
  );
}

function canDelete(membership, organization, opportunity) {
  return (
    isOwner(membership) &&
    belongsToOrganization(opportunity, organization) &&
    opportunity.approvalStatus === Opportunity.APPROVAL_DRAFT
  );
}

function canSubmit(membership, organization, opportunity) {
  return (
    isOwner(membership) &&
    belongsToOrganization(opportunity, organization) &&
    (opportunity.approvalStatus === Opportunity.APPROVAL_DRAFT ||
      opportunity.approvalStatus === Opportunity.APPROVAL_REJECTED)
  );
}

function canCreate(membership) {
  return isOwner(membership);
}

function canApprove() {
  return false;
}

module.exports = {
  canView,
  canUpdate,
  canDelete,
  canSubmit,
  canCreate,
  canApprove,
};
