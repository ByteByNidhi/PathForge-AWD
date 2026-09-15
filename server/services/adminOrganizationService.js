const Organization = require('../models/Organization');
const OrganizationUser = require('../models/OrganizationUser');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { validateEmail, validatePassword, normalizeEmail } = require('../utils/validators');
const { hasValidApplicationUrl } = require('./opportunityService');
const { serializeOrganization } = require('./organizationAccess');

function collectErrors(pairs) {
  return pairs.filter((pair) => pair.message).map((pair) => ({ field: pair.field, message: pair.message }));
}

function throwIfInvalid(errors) {
  if (errors.length) {
    throw new AppError(errors[0].message, 400, errors);
  }
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'organization';
}

async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let index = 2;
  while (await Organization.exists({ slug })) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

async function list() {
  const organizations = await Organization.find().sort({ name: 1 });
  const rows = [];

  for (const organization of organizations) {
    const [memberCount, opportunityCount] = await Promise.all([
      OrganizationUser.countDocuments({ organizationId: organization._id }),
      Opportunity.countDocuments({ organizationId: organization._id }),
    ]);
    rows.push({
      ...serializeOrganization(organization),
      memberCount,
      opportunityCount,
    });
  }

  return { organizations: rows };
}

async function create(body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const phone = body.phone == null ? null : String(body.phone).trim() || null;
  const website = body.website == null ? null : String(body.website).trim() || null;
  const description = body.description == null ? null : String(body.description).trim() || null;
  const ownerName = String(body.ownerName || body.owner_name || '').trim();
  const ownerEmail = normalizeEmail(body.ownerEmail || body.owner_email);
  const ownerPassword = String(body.ownerPassword || body.owner_password || '');

  const errors = collectErrors([
    { field: 'name', message: name ? (name.length > 255 ? 'Name must be 255 characters or fewer' : null) : 'Name is required' },
    { field: 'email', message: validateEmail(email) },
    { field: 'ownerName', message: ownerName ? (ownerName.length > 255 ? 'Owner name must be 255 characters or fewer' : null) : 'Owner name is required' },
    { field: 'ownerEmail', message: validateEmail(ownerEmail) },
    { field: 'ownerPassword', message: validatePassword(ownerPassword) },
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

  throwIfInvalid(errors);

  const existingOwner = await User.findOne({ email: ownerEmail });
  if (existingOwner) {
    throw new AppError('That owner email is already in use', 400, [
      { field: 'ownerEmail', message: 'That owner email is already in use' },
    ]);
  }

  const organization = await Organization.create({
    name,
    slug: await uniqueSlug(name),
    email,
    phone,
    website,
    description,
    status: 'active',
  });

  const owner = await User.create({
    name: ownerName,
    email: ownerEmail,
    password: ownerPassword,
    role: 'organization',
    onboardingCompleted: true,
  });

  await OrganizationUser.create({
    organizationId: organization._id,
    userId: owner._id,
    role: 'owner',
  });

  return {
    organization: {
      ...serializeOrganization(organization),
      memberCount: 1,
      opportunityCount: 0,
    },
    owner: {
      id: String(owner._id),
      name: owner.name,
      email: owner.email,
      role: owner.role,
    },
  };
}

module.exports = {
  list,
  create,
};
