const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const Skill = require('../models/Skill');
const AppError = require('../utils/AppError');
const { isValidId, idOf } = require('../utils/ids');
const { startOfDay } = require('./opportunityStatus');
const { hasValidApplicationUrl } = require('./opportunityService');
const { belongsToOrganization } = require('./organizationAccess');
const policy = require('./organizationOpportunityPolicy');

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function deadlineBounds(now = new Date()) {
  const min = startOfDay(now);
  const max = addYears(min, 1);
  return { min, max };
}

function formatDateOnly(date) {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value) {
  if (value == null || value === '') {
    return null;
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return startOfDay(value);
}

function collectErrors(pairs) {
  return pairs.filter((pair) => pair.message).map((pair) => ({ field: pair.field, message: pair.message }));
}

function throwIfInvalid(errors) {
  if (errors.length) {
    throw new AppError(errors[0].message, 400, errors);
  }
}

function assertNoTrustedFields(body) {
  const errors = [];
  if (Object.prototype.hasOwnProperty.call(body, 'approvalStatus') || Object.prototype.hasOwnProperty.call(body, 'approval_status')) {
    errors.push({ field: 'approvalStatus', message: 'Organizations cannot set approval status directly.' });
  }
  if (Object.prototype.hasOwnProperty.call(body, 'organizationId') || Object.prototype.hasOwnProperty.call(body, 'organization_id')) {
    errors.push({ field: 'organizationId', message: 'Organization id cannot be supplied by the client.' });
  }
  throwIfInvalid(errors);
}

function intentFrom(body) {
  return body && body.intent === 'submit' ? 'submit' : 'draft';
}

function uniqueSkillIds(values) {
  return [...new Set((values || []).map((value) => String(value)).filter(Boolean))];
}

async function resolveSkillIds(body) {
  if (body.noSpecificSkill || body.no_specific_skill) {
    return [];
  }

  const raw = body.skillIds || body.skill_ids || [];
  const ids = uniqueSkillIds(Array.isArray(raw) ? raw : [raw]);
  if (!ids.length) {
    return [];
  }

  if (ids.some((id) => !isValidId(id))) {
    throw new AppError('One or more skills are invalid', 400, [
      { field: 'skillIds', message: 'One or more skills are invalid' },
    ]);
  }

  const skills = await Skill.find({ _id: { $in: ids } });
  if (skills.length !== ids.length) {
    throw new AppError('Skills must be selected from the catalogue', 400, [
      { field: 'skillIds', message: 'Skills must be selected from the catalogue' },
    ]);
  }

  return ids;
}

async function skillNames(skillIds) {
  if (!skillIds.length) {
    return null;
  }
  const skills = await Skill.find({ _id: { $in: skillIds } }).sort({ name: 1 });
  const names = skills.map((skill) => skill.name).filter(Boolean);
  return names.length ? names.join(', ') : null;
}

async function syncOpportunitySkills(opportunityId, skillIds) {
  await OpportunitySkill.deleteMany({ opportunityId });
  if (!skillIds.length) {
    return [];
  }
  await OpportunitySkill.insertMany(
    skillIds.map((skillId) => ({
      opportunityId,
      skillId,
    }))
  );
  return skillIds;
}

function validatePayload(body, { requireCore = true } = {}) {
  const errors = [];
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const description = String(body.description || '').trim();
  const location = body.location == null ? null : String(body.location).trim() || null;
  const eligibility = body.eligibility == null ? null : String(body.eligibility).trim() || null;
  const applicationUrlRaw = body.applicationUrl ?? body.application_url;
  const applicationUrl = applicationUrlRaw == null ? null : String(applicationUrlRaw).trim() || null;
  const deadlineRaw = Object.prototype.hasOwnProperty.call(body, 'deadline') ? body.deadline : undefined;

  if (requireCore) {
    if (!title) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or fewer' });
    }

    if (!type) {
      errors.push({ field: 'type', message: 'Type is required' });
    } else if (!Opportunity.TYPES.includes(type)) {
      errors.push({ field: 'type', message: 'Select a valid opportunity type' });
    }

    if (!description) {
      errors.push({ field: 'description', message: 'Description is required' });
    }
  }

  if (location && location.length > 255) {
    errors.push({ field: 'location', message: 'Location must be 255 characters or fewer' });
  }

  if (eligibility && eligibility.length > 5000) {
    errors.push({ field: 'eligibility', message: 'Eligibility must be 5000 characters or fewer' });
  }

  if (applicationUrl) {
    if (applicationUrl.length > 2048 || !hasValidApplicationUrl(applicationUrl)) {
      errors.push({
        field: 'applicationUrl',
        message: 'The application URL must start with http or https.',
      });
    }
  }

  let deadline = null;
  if (deadlineRaw != null && deadlineRaw !== '') {
    deadline = parseDateOnly(deadlineRaw);
    if (!deadline || Number.isNaN(deadline.getTime())) {
      errors.push({ field: 'deadline', message: 'Enter a valid deadline' });
    } else {
      const { min, max } = deadlineBounds();
      if (deadline < min) {
        errors.push({ field: 'deadline', message: 'The deadline must be today or later.' });
      } else if (deadline > max) {
        errors.push({
          field: 'deadline',
          message: 'Organization opportunity deadlines cannot be more than 1 year from today.',
        });
      }
    }
  }

  throwIfInvalid(errors);

  return {
    title,
    type,
    description,
    location,
    eligibility,
    applicationUrl,
    deadline,
  };
}

async function skillsForOpportunity(opportunityId) {
  const rows = await OpportunitySkill.find({ opportunityId }).populate('skillId');
  return rows
    .map((row) => row.skillId)
    .filter(Boolean)
    .map((skill) => ({
      id: String(skill._id),
      _id: skill._id,
      name: skill.name,
      slug: skill.slug,
    }));
}

function serializeOpportunity(opportunity, skills, membership, organization) {
  return {
    id: String(opportunity._id),
    _id: opportunity._id,
    title: opportunity.title,
    organization: opportunity.organization,
    type: opportunity.type,
    description: opportunity.description ?? null,
    requiredSkills: opportunity.requiredSkills ?? null,
    eligibility: opportunity.eligibility ?? null,
    deadline: opportunity.deadline ?? null,
    applicationUrl: opportunity.applicationUrl ?? null,
    location: opportunity.location ?? null,
    source: opportunity.source || Opportunity.SOURCE_ORGANIZATION,
    approvalStatus: opportunity.approvalStatus,
    organizationId: opportunity.organizationId || null,
    submittedByUserId: opportunity.submittedByUserId || null,
    rejectionReason: opportunity.rejectionReason || null,
    skills,
    skillIds: skills.map((skill) => skill.id),
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    canEdit: policy.canUpdate(membership, organization, opportunity),
    canDelete: policy.canDelete(membership, organization, opportunity),
    canSubmit: policy.canSubmit(membership, organization, opportunity),
  };
}

async function decorate(opportunity, membership, organization) {
  const skills = await skillsForOpportunity(opportunity._id);
  return serializeOpportunity(opportunity, skills, membership, organization);
}

async function formMeta() {
  const { min, max } = deadlineBounds();
  const skills = await Skill.find().sort({ name: 1 });
  return {
    types: Opportunity.TYPES,
    deadlineMin: formatDateOnly(min),
    deadlineMax: formatDateOnly(max),
    skills: skills.map((skill) => ({
      id: String(skill._id),
      _id: skill._id,
      name: skill.name,
      slug: skill.slug,
    })),
  };
}

async function listForOrganization(organization, membership) {
  const docs = await Opportunity.find({ organizationId: organization._id }).sort({ createdAt: -1, _id: -1 });
  const opportunities = [];
  for (const doc of docs) {
    opportunities.push(await decorate(doc, membership, organization));
  }
  return {
    opportunities,
    isOwner: policy.canCreate(membership),
    form: await formMeta(),
  };
}

async function loadOwnedOpportunity(organization, id) {
  if (!isValidId(id)) {
    throw new AppError('Opportunity not found', 404);
  }
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }
  if (!belongsToOrganization(opportunity, organization)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  return opportunity;
}

async function getForOrganization(organization, membership, id) {
  const opportunity = await loadOwnedOpportunity(organization, id);
  if (!policy.canView(membership, organization, opportunity)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  return {
    opportunity: await decorate(opportunity, membership, organization),
    isOwner: policy.canCreate(membership),
    form: await formMeta(),
  };
}

async function createForOrganization(user, organization, membership, body) {
  if (!policy.canCreate(membership)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  assertNoTrustedFields(body);
  const payload = validatePayload(body);
  const skillIds = await resolveSkillIds(body);
  const intent = intentFrom(body);
  const requiredSkills = await skillNames(skillIds);

  const opportunity = await Opportunity.create({
    title: payload.title,
    organization: organization.name,
    type: payload.type,
    description: payload.description,
    requiredSkills,
    eligibility: payload.eligibility,
    deadline: payload.deadline,
    applicationUrl: payload.applicationUrl,
    location: payload.location,
    source: Opportunity.SOURCE_ORGANIZATION,
    approvalStatus: intent === 'submit' ? Opportunity.APPROVAL_PENDING : Opportunity.APPROVAL_DRAFT,
    organizationId: organization._id,
    submittedByUserId: user._id,
    rejectionReason: null,
  });

  await syncOpportunitySkills(opportunity._id, skillIds);
  return decorate(opportunity, membership, organization);
}

async function updateForOrganization(organization, membership, id, body) {
  const opportunity = await loadOwnedOpportunity(organization, id);
  if (!policy.canUpdate(membership, organization, opportunity)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  assertNoTrustedFields(body);
  const payload = validatePayload(body);
  const skillIds = await resolveSkillIds(body);
  const intent = intentFrom(body);
  const requiredSkills = await skillNames(skillIds);

  let status = opportunity.approvalStatus;
  let rejectionReason = opportunity.rejectionReason;
  if (intent === 'submit' && policy.canSubmit(membership, organization, opportunity)) {
    status = Opportunity.APPROVAL_PENDING;
    rejectionReason = null;
  }

  opportunity.title = payload.title;
  opportunity.organization = organization.name;
  opportunity.type = payload.type;
  opportunity.description = payload.description;
  opportunity.requiredSkills = requiredSkills;
  opportunity.eligibility = payload.eligibility;
  opportunity.deadline = payload.deadline;
  opportunity.applicationUrl = payload.applicationUrl;
  opportunity.location = payload.location;
  opportunity.source = Opportunity.SOURCE_ORGANIZATION;
  opportunity.organizationId = organization._id;
  opportunity.approvalStatus = status;
  opportunity.rejectionReason = rejectionReason;
  await opportunity.save();
  await syncOpportunitySkills(opportunity._id, skillIds);
  return decorate(opportunity, membership, organization);
}

async function submitForOrganization(organization, membership, id) {
  const opportunity = await loadOwnedOpportunity(organization, id);
  if (!policy.canSubmit(membership, organization, opportunity)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  opportunity.approvalStatus = Opportunity.APPROVAL_PENDING;
  opportunity.rejectionReason = null;
  opportunity.source = Opportunity.SOURCE_ORGANIZATION;
  await opportunity.save();
  return decorate(opportunity, membership, organization);
}

async function deleteForOrganization(organization, membership, id) {
  const opportunity = await loadOwnedOpportunity(organization, id);
  if (!policy.canDelete(membership, organization, opportunity)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  await OpportunitySkill.deleteMany({ opportunityId: opportunity._id });
  await opportunity.deleteOne();
}

module.exports = {
  deadlineBounds,
  formatDateOnly,
  formMeta,
  listForOrganization,
  getForOrganization,
  createForOrganization,
  updateForOrganization,
  submitForOrganization,
  deleteForOrganization,
  validatePayload,
};
