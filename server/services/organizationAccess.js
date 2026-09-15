const Organization = require('../models/Organization');
const OrganizationUser = require('../models/OrganizationUser');
const { idOf } = require('../utils/ids');

async function findMembershipForUser(userId) {
  if (!userId) {
    return null;
  }

  return OrganizationUser.findOne({ userId }).sort({ _id: 1 });
}

async function resolveOrganizationAccess(user) {
  const membership = await findMembershipForUser(user && user._id);
  if (!membership) {
    return null;
  }

  const organization = await Organization.findById(membership.organizationId);
  if (!organization) {
    return null;
  }

  return { organization, membership };
}

function isOwner(membership) {
  return Boolean(membership && membership.role === 'owner');
}

function isAdminUser(user) {
  return Boolean(user && user.role === 'admin');
}

async function isOrganizationMember(user) {
  if (!user) {
    return false;
  }
  const membership = await findMembershipForUser(user._id || user.id);
  return Boolean(membership);
}

function serializeOrganization(organization) {
  if (!organization) {
    return null;
  }

  return {
    id: String(organization._id),
    _id: organization._id,
    name: organization.name,
    slug: organization.slug,
    email: organization.email,
    phone: organization.phone || null,
    website: organization.website || null,
    description: organization.description || null,
    logoUrl: organization.logoUrl || null,
    status: organization.status || 'active',
  };
}

async function serializeUserWithOrganization(user) {
  const safe = user.toSafeObject();
  const access = await resolveOrganizationAccess(user);
  safe.isOrganizationUser = Boolean(access);
  safe.organization = access
    ? {
        id: String(access.organization._id),
        name: access.organization.name,
        slug: access.organization.slug,
        status: access.organization.status,
        role: access.membership.role,
      }
    : null;
  return safe;
}

function belongsToOrganization(opportunity, organization) {
  if (!opportunity || !organization || !opportunity.organizationId) {
    return false;
  }
  return idOf(opportunity.organizationId) === idOf(organization._id);
}

module.exports = {
  findMembershipForUser,
  resolveOrganizationAccess,
  isOwner,
  isAdminUser,
  isOrganizationMember,
  serializeOrganization,
  serializeUserWithOrganization,
  belongsToOrganization,
};
