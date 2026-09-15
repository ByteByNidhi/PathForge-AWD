const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const SavedOpportunity = require('../models/SavedOpportunity');
const LearningPath = require('../models/LearningPath');
const AppError = require('../utils/AppError');
const { isValidId } = require('../utils/ids');
const { startOfDay } = require('./opportunityStatus');
const { hasValidApplicationUrl, sourceLabel } = require('./opportunityService');

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
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

function isHimalayas(opportunity) {
  return Boolean(opportunity && opportunity.source === Opportunity.SOURCE_HIMALAYAS);
}

function isOrganizationSourced(opportunity) {
  return Boolean(opportunity && opportunity.source === Opportunity.SOURCE_ORGANIZATION);
}

function deadlineMaxYears(opportunity) {
  if (isHimalayas(opportunity)) {
    return null;
  }
  if (isOrganizationSourced(opportunity)) {
    return 1;
  }
  return 2;
}

function deadlineBoundsFor(opportunity, now = new Date()) {
  const years = deadlineMaxYears(opportunity);
  if (years == null) {
    return { min: null, max: null };
  }
  const min = startOfDay(now);
  return { min, max: addYears(min, years) };
}

function allowedTypes(opportunity) {
  const types = [...Opportunity.TYPES];
  if (opportunity && opportunity.type && !types.includes(opportunity.type)) {
    types.push(opportunity.type);
  }
  return types;
}

function formMeta(opportunity = null) {
  const { min, max } = deadlineBoundsFor(opportunity);
  return {
    types: allowedTypes(opportunity),
    deadlineMin: formatDateOnly(min),
    deadlineMax: formatDateOnly(max),
    lockExternalDeadline: isHimalayas(opportunity),
  };
}

function canApprove(opportunity) {
  return (
    opportunity.approvalStatus === Opportunity.APPROVAL_PENDING ||
    opportunity.approvalStatus === Opportunity.APPROVAL_REJECTED
  );
}

function canReject(opportunity) {
  return (
    opportunity.approvalStatus === Opportunity.APPROVAL_PENDING ||
    opportunity.approvalStatus === Opportunity.APPROVAL_APPROVED
  );
}

function serialize(opportunity) {
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
    source: opportunity.source || null,
    sourceLabel: sourceLabel(opportunity),
    externalId: opportunity.externalId ?? null,
    sourceUrl: opportunity.sourceUrl ?? null,
    approvalStatus: opportunity.approvalStatus,
    organizationId: opportunity.organizationId || null,
    submittedByUserId: opportunity.submittedByUserId || null,
    rejectionReason: opportunity.rejectionReason || null,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    canApprove: canApprove(opportunity),
    canReject: canReject(opportunity),
    canEdit: true,
    canDelete: true,
  };
}

async function loadOpportunity(id) {
  if (!isValidId(id)) {
    throw new AppError('Opportunity not found', 404);
  }
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }
  return opportunity;
}

function validatePayload(body, opportunity = null) {
  const title = String(body.title || '').trim();
  const organization = String(body.organization || '').trim();
  const type = String(body.type || '').trim();
  const description = body.description == null ? null : String(body.description).trim() || null;
  const requiredSkills = (body.requiredSkills ?? body.required_skills) == null
    ? null
    : String(body.requiredSkills ?? body.required_skills).trim() || null;
  const eligibility = body.eligibility == null ? null : String(body.eligibility).trim() || null;
  const location = body.location == null ? null : String(body.location).trim() || null;
  const applicationUrlRaw = body.applicationUrl ?? body.application_url;
  const applicationUrl = applicationUrlRaw == null ? '' : String(applicationUrlRaw).trim();
  const deadlineRaw = Object.prototype.hasOwnProperty.call(body, 'deadline') ? body.deadline : undefined;
  const types = allowedTypes(opportunity);

  const errors = collectErrors([
    { field: 'title', message: title ? (title.length > 255 ? 'Title must be 255 characters or fewer' : null) : 'Title is required' },
    {
      field: 'organization',
      message: organization
        ? organization.length > 255
          ? 'Organization must be 255 characters or fewer'
          : null
        : 'Organization is required',
    },
    {
      field: 'type',
      message: type ? (types.includes(type) ? null : 'Select a valid opportunity type') : 'Type is required',
    },
    {
      field: 'applicationUrl',
      message: applicationUrl
        ? applicationUrl.length > 2048 || !hasValidApplicationUrl(applicationUrl)
          ? 'The application URL must start with http or https.'
          : null
        : 'Application URL is required',
    },
  ]);

  if (location && location.length > 255) {
    errors.push({ field: 'location', message: 'Location must be 255 characters or fewer' });
  }

  let deadline = null;
  if (deadlineRaw != null && deadlineRaw !== '') {
    deadline = parseDateOnly(deadlineRaw);
    if (!deadline || Number.isNaN(deadline.getTime())) {
      errors.push({ field: 'deadline', message: 'Enter a valid deadline' });
    } else if (!isHimalayas(opportunity)) {
      const { min, max } = deadlineBoundsFor(opportunity);
      const years = deadlineMaxYears(opportunity);
      if (deadline < min) {
        errors.push({ field: 'deadline', message: 'The deadline must be today or later.' });
      } else if (deadline > max) {
        errors.push({
          field: 'deadline',
          message:
            years === 1
              ? 'Organization opportunity deadlines cannot be more than 1 year from today.'
              : 'Manual opportunity deadlines cannot be more than 2 years from today.',
        });
      }
    }
  }

  throwIfInvalid(errors);

  return {
    title,
    organization,
    type,
    description,
    requiredSkills,
    eligibility,
    deadline,
    applicationUrl,
    location,
  };
}

async function dashboard() {
  const [opportunities, pendingCount, organizationCount, userCount, pendingCareerPathRequests] = await Promise.all([
    Opportunity.find().sort({ createdAt: -1, _id: -1 }).limit(8),
    Opportunity.countDocuments({ approvalStatus: Opportunity.APPROVAL_PENDING }),
    require('../models/Organization').countDocuments(),
    require('../models/User').countDocuments(),
    require('../models/CareerPathRequest').countDocuments({ status: 'pending' }),
  ]);

  const counts = await Opportunity.aggregate([
    { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((row) => [row._id || 'unknown', row.count]));

  return {
    stats: {
      pendingOpportunities: pendingCount,
      totalOpportunities: await Opportunity.countDocuments(),
      draft: byStatus.draft || 0,
      pending: byStatus.pending || 0,
      approved: byStatus.approved || 0,
      rejected: byStatus.rejected || 0,
      organizations: organizationCount,
      users: userCount,
      pendingCareerPathRequests,
    },
    recentOpportunities: opportunities.map(serialize),
    form: formMeta(),
  };
}

async function list(query = {}) {
  const filter = {};
  const status = String(query.status || query.approvalStatus || '').trim();
  if (status && Opportunity.APPROVAL_STATUSES.includes(status)) {
    filter.approvalStatus = status;
  }

  const opportunities = await Opportunity.find(filter).sort({ createdAt: -1, _id: -1 });
  const pending = opportunities.filter((item) => item.approvalStatus === Opportunity.APPROVAL_PENDING);
  const learningPaths = await LearningPath.find().sort({ pathName: 1, title: 1 }).select('pathName title');

  return {
    opportunities: opportunities.map(serialize),
    pending: (status && status !== Opportunity.APPROVAL_PENDING
      ? await Opportunity.find({ approvalStatus: Opportunity.APPROVAL_PENDING }).sort({ createdAt: -1, _id: -1 })
      : pending
    ).map(serialize),
    learningPaths: learningPaths.map((path) => ({
      id: String(path._id),
      pathName: path.pathName || path.title,
    })),
    form: formMeta(),
  };
}

async function getById(id) {
  const opportunity = await loadOpportunity(id);
  return {
    opportunity: serialize(opportunity),
    form: formMeta(opportunity),
  };
}

async function create(body) {
  const payload = validatePayload(body);
  const opportunity = await Opportunity.create({
    ...payload,
    approvalStatus: Opportunity.APPROVAL_APPROVED,
    source: null,
    externalId: null,
    sourceUrl: null,
    organizationId: null,
    submittedByUserId: null,
    rejectionReason: null,
  });
  return serialize(opportunity);
}

async function update(id, body) {
  const opportunity = await loadOpportunity(id);
  const payload = validatePayload(body, opportunity);
  const preserved = {
    source: opportunity.source,
    externalId: opportunity.externalId,
    sourceUrl: opportunity.sourceUrl,
    organizationId: opportunity.organizationId,
    submittedByUserId: opportunity.submittedByUserId,
    approvalStatus: opportunity.approvalStatus,
    rejectionReason: opportunity.rejectionReason,
  };

  Object.assign(opportunity, payload);
  opportunity.source = preserved.source;
  opportunity.externalId = preserved.externalId;
  opportunity.sourceUrl = preserved.sourceUrl;
  opportunity.organizationId = preserved.organizationId;
  opportunity.submittedByUserId = preserved.submittedByUserId;
  opportunity.approvalStatus = preserved.approvalStatus;
  opportunity.rejectionReason = preserved.rejectionReason;
  await opportunity.save();
  return serialize(opportunity);
}

async function approve(id) {
  const opportunity = await loadOpportunity(id);
  if (!canApprove(opportunity)) {
    throw new AppError('This opportunity cannot be approved in its current state.', 403);
  }

  opportunity.approvalStatus = Opportunity.APPROVAL_APPROVED;
  opportunity.rejectionReason = null;
  await opportunity.save();
  return serialize(opportunity);
}

async function reject(id, body = {}) {
  const opportunity = await loadOpportunity(id);
  if (!canReject(opportunity)) {
    throw new AppError('This opportunity cannot be rejected in its current state.', 403);
  }

  const raw = body.rejectionReason ?? body.rejection_reason;
  const rejectionReason = raw == null ? null : String(raw).trim() || null;
  if (rejectionReason && rejectionReason.length > 2000) {
    throw new AppError('Rejection reason must be 2000 characters or fewer', 400, [
      { field: 'rejectionReason', message: 'Rejection reason must be 2000 characters or fewer' },
    ]);
  }

  opportunity.approvalStatus = Opportunity.APPROVAL_REJECTED;
  opportunity.rejectionReason = rejectionReason;
  await opportunity.save();
  return serialize(opportunity);
}

async function destroy(id) {
  const opportunity = await loadOpportunity(id);
  await Promise.all([
    OpportunitySkill.deleteMany({ opportunityId: opportunity._id }),
    SavedOpportunity.deleteMany({ opportunityId: opportunity._id }),
  ]);
  await opportunity.deleteOne();
}

module.exports = {
  dashboard,
  list,
  getById,
  create,
  update,
  approve,
  reject,
  destroy,
  formMeta,
  serialize,
};
