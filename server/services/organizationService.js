const Opportunity = require('../models/Opportunity');
const OrganizationUser = require('../models/OrganizationUser');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { isValidId, idOf } = require('../utils/ids');
const { hasValidApplicationUrl } = require('./opportunityService');
const { isOwner, serializeOrganization } = require('./organizationAccess');
const organizationOpportunityService = require('./organizationOpportunityService');

function collectErrors(pairs) {
  return pairs.filter((pair) => pair.message).map((pair) => ({ field: pair.field, message: pair.message }));
}

function throwIfInvalid(errors) {
  if (errors.length) {
    throw new AppError(errors[0].message, 400, errors);
  }
}

function permissions(membership) {
  const owner = isOwner(membership);
  return {
    isOwner: owner,
    canUpdateProfile: owner,
    canManageMembers: owner,
    canCreateOpportunity: owner,
  };
}

async function dashboard(organization, membership) {
  const opportunities = await Opportunity.find({ organizationId: organization._id }).sort({
    createdAt: -1,
    _id: -1,
  });

  const stats = {
    total: opportunities.length,
    draft: opportunities.filter((item) => item.approvalStatus === Opportunity.APPROVAL_DRAFT).length,
    pending: opportunities.filter((item) => item.approvalStatus === Opportunity.APPROVAL_PENDING).length,
    approved: opportunities.filter((item) => item.approvalStatus === Opportunity.APPROVAL_APPROVED).length,
    rejected: opportunities.filter((item) => item.approvalStatus === Opportunity.APPROVAL_REJECTED).length,
  };

  const recent = [];
  for (const opportunity of opportunities.slice(0, 8)) {
    recent.push(
      (
        await organizationOpportunityService.getForOrganization(
          organization,
          membership,
          opportunity.id
        )
      ).opportunity
    );
  }

  return {
    organization: serializeOrganization(organization),
    stats,
    recent,
    permissions: permissions(membership),
    form: await organizationOpportunityService.formMeta(),
  };
}

function validateProfile(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = body.phone == null ? null : String(body.phone).trim() || null;
  const website = body.website == null ? null : String(body.website).trim() || null;
  const description = body.description == null ? null : String(body.description).trim() || null;
  const logoUrl = (body.logoUrl ?? body.logo_url) == null
    ? null
    : String(body.logoUrl ?? body.logo_url).trim() || null;

  const errors = collectErrors([
    { field: 'name', message: name ? (name.length > 255 ? 'Name must be 255 characters or fewer' : null) : 'Name is required' },
    {
      field: 'email',
      message: email
        ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255
          ? 'Enter a valid email address'
          : null
        : 'Email is required',
    },
  ]);

  if (phone && phone.length > 50) {
    errors.push({ field: 'phone', message: 'Phone must be 50 characters or fewer' });
  }
  if (website && (website.length > 255 || !hasValidApplicationUrl(website))) {
    errors.push({ field: 'website', message: 'Enter a valid website URL' });
  }
  if (description && description.length > 5000) {
    errors.push({ field: 'description', message: 'Description must be 5000 characters or fewer' });
  }
  if (logoUrl && (logoUrl.length > 2048 || !hasValidApplicationUrl(logoUrl))) {
    errors.push({ field: 'logoUrl', message: 'Enter a valid logo URL' });
  }

  throwIfInvalid(errors);
  return { name, email, phone, website, description, logoUrl };
}

async function updateProfile(organization, membership, body) {
  if (!isOwner(membership)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  const payload = validateProfile(body);
  organization.name = payload.name;
  organization.email = payload.email;
  organization.phone = payload.phone;
  organization.website = payload.website;
  organization.description = payload.description;
  organization.logoUrl = payload.logoUrl;
  await organization.save();

  await Opportunity.updateMany(
    { organizationId: organization._id },
    { $set: { organization: payload.name } }
  );

  return serializeOrganization(organization);
}

async function listMembers(organization) {
  const memberships = await OrganizationUser.find({ organizationId: organization._id }).populate(
    'userId',
    'name email role'
  );

  return memberships
    .filter((row) => row.userId)
    .sort((left, right) => String(left.userId.name || '').localeCompare(String(right.userId.name || '')))
    .map((row) => ({
      id: String(row.userId._id),
      userId: String(row.userId._id),
      name: row.userId.name,
      email: row.userId.email,
      role: row.role,
    }));
}

async function ownerCount(organizationId) {
  return OrganizationUser.countDocuments({ organizationId, role: 'owner' });
}

async function addMember(organization, membership, body) {
  if (!isOwner(membership)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const role = String(body.role || 'member').trim();

  throwIfInvalid(
    collectErrors([
      { field: 'email', message: email ? null : 'Email is required' },
      {
        field: 'role',
        message: ['owner', 'member'].includes(role) ? null : 'Role must be owner or member',
      },
    ])
  );

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('That user could not be found', 400, [
      { field: 'email', message: 'That user could not be found' },
    ]);
  }
  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be added as organization members.', 400, [
      { field: 'email', message: 'Admin accounts cannot be added as organization members.' },
    ]);
  }

  const existing = await OrganizationUser.findOne({ organizationId: organization._id, userId: user._id });
  if (existing) {
    throw new AppError('That user is already a member of this organization.', 400, [
      { field: 'email', message: 'That user is already a member of this organization.' },
    ]);
  }

  await OrganizationUser.create({
    organizationId: organization._id,
    userId: user._id,
    role,
  });

  return listMembers(organization);
}

async function updateMember(organization, membership, userId, body) {
  if (!isOwner(membership)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  if (!isValidId(userId)) {
    throw new AppError('Member not found', 404);
  }

  const role = String(body.role || '').trim();
  if (!['owner', 'member'].includes(role)) {
    throw new AppError('Role must be owner or member', 400, [
      { field: 'role', message: 'Role must be owner or member' },
    ]);
  }

  const target = await OrganizationUser.findOne({ organizationId: organization._id, userId });
  if (!target) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  if (target.role === 'owner' && role !== 'owner' && (await ownerCount(organization._id)) <= 1) {
    throw new AppError('The organization must keep at least one owner.', 400, [
      { field: 'role', message: 'The organization must keep at least one owner.' },
    ]);
  }

  target.role = role;
  await target.save();
  return listMembers(organization);
}

async function removeMember(organization, membership, userId) {
  if (!isOwner(membership)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  if (!isValidId(userId)) {
    throw new AppError('Member not found', 404);
  }

  const target = await OrganizationUser.findOne({ organizationId: organization._id, userId });
  if (!target) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  if (target.role === 'owner' && (await ownerCount(organization._id)) <= 1) {
    throw new AppError('The last owner cannot be removed.', 400, [
      { field: 'email', message: 'The last owner cannot be removed.' },
    ]);
  }

  await target.deleteOne();
  return listMembers(organization);
}

function currentUserId(membership) {
  return idOf(membership.userId);
}

module.exports = {
  permissions,
  dashboard,
  updateProfile,
  listMembers,
  addMember,
  updateMember,
  removeMember,
  currentUserId,
};
