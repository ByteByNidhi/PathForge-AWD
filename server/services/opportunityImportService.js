const LearningPath = require('../models/LearningPath');
const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const Skill = require('../models/Skill');
const AppError = require('../utils/AppError');
const { isValidId } = require('../utils/ids');
const himalayasJobService = require('./himalayasJobService');
const { matchCatalogSkills } = require('./opportunitySkillMatcher');
const { uniqueSkillNames } = require('./opportunitySkillMatch');

function parseDateOnly(value) {
  if (value == null || value === '') {
    return null;
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function persistableFields(job) {
  return {
    title: job.title,
    organization: job.organization,
    type: job.type,
    description: job.description || null,
    eligibility: job.eligibility ? job.eligibility : null,
    deadline: parseDateOnly(job.deadline),
    applicationUrl: job.applicationUrl,
    location: job.location || null,
    source: himalayasJobService.SOURCE,
    externalId: job.externalId,
    sourceUrl: job.sourceUrl,
    approvalStatus: Opportunity.APPROVAL_PENDING,
    organizationId: null,
    submittedByUserId: null,
    rejectionReason: null,
  };
}

function searchQueryForPath(path) {
  const name = String(path.pathName || path.title || '').trim();
  const primary = name.replace(/\s+development$/i, ' developer').trim();
  const skillNames = uniqueSkillNames(
    (path.skills || []).map((skill) => skill && skill.name).filter(Boolean)
  ).slice(0, 4);

  return `${primary} ${skillNames.join(' ')}`.trim();
}

async function loadLearningPath(id) {
  if (!isValidId(id)) {
    throw new AppError('Learning path not found', 404);
  }
  const path = await LearningPath.findById(id).populate('skills');
  if (!path) {
    throw new AppError('Learning path not found', 404);
  }
  return path;
}

async function findExisting(job) {
  const source = job.source || himalayasJobService.SOURCE;
  const externalId = String(job.externalId || '').trim();

  if (externalId) {
    const byIdentity = await Opportunity.findOne({ source, externalId });
    if (byIdentity) {
      return byIdentity;
    }
  }

  const applicationUrl = String(job.applicationUrl || '').trim();
  if (!applicationUrl) {
    return null;
  }

  return Opportunity.findOne({ applicationUrl });
}

async function storeJob(job, catalogSkills) {
  const matchHaystack = String(job.matchText || [job.title, job.description, job.eligibility].join(' '));
  const matched = [];
  const seen = new Set();
  for (const skill of matchCatalogSkills(matchHaystack, catalogSkills)) {
    const id = String(skill._id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    matched.push(skill);
  }
  const skillNames = uniqueSkillNames(matched.map((skill) => skill.name));

  const opportunity = await Opportunity.create({
    ...persistableFields(job),
    requiredSkills: skillNames.length ? skillNames.join(', ') : null,
  });

  if (matched.length) {
    await OpportunitySkill.insertMany(
      matched.map((skill) => ({
        opportunityId: opportunity._id,
        skillId: skill._id,
      })),
      { ordered: false }
    ).catch((error) => {
      if (error && error.code !== 11000) {
        throw error;
      }
    });
  }

  return opportunity;
}

async function importFromSearch(query, filters = {}) {
  const result = await himalayasJobService.fetchJobs(query, filters);
  const catalogSkills = await Skill.find();
  let imported = 0;
  let skippedDuplicates = 0;
  let skippedInvalid = result.skippedInvalid;

  for (const job of result.jobs) {
    if (await findExisting(job)) {
      skippedDuplicates += 1;
      continue;
    }

    try {
      await storeJob(job, catalogSkills);
      imported += 1;
    } catch (error) {
      if (error && error.code === 11000) {
        skippedDuplicates += 1;
        continue;
      }
      skippedInvalid += 1;
    }
  }

  return {
    fetched: result.fetched,
    imported,
    skippedDuplicates,
    duplicates: skippedDuplicates,
    skippedInvalid,
    query: String(query || '').trim(),
  };
}

function importMessage(stats, pathName) {
  if (stats.fetched === 0) {
    return 'No jobs matched that search. Try another learning path or query.';
  }

  const pathLabel = pathName ? ` for ${pathName}` : '';
  const jobWord = stats.fetched === 1 ? '' : 's';
  let message = `Fetched ${stats.fetched} job${jobWord}${pathLabel}. Newly imported: ${stats.imported}. Duplicates skipped: ${stats.skippedDuplicates}. New listings stay pending until approved.`;
  if (stats.skippedInvalid) {
    message += ` Skipped invalid: ${stats.skippedInvalid}.`;
  }
  return message;
}

async function importFromAdminRequest(body = {}) {
  const queryInput = String(body.query ?? body.q ?? '').trim();
  const country = String(body.country || '').trim();
  const learningPathId = body.learningPathId ?? body.learning_path_id ?? null;

  let path = null;
  let query = queryInput;

  if (learningPathId) {
    path = await loadLearningPath(learningPathId);
    if (!query) {
      query = searchQueryForPath(path);
    }
  }

  if (!query) {
    throw new AppError('Choose a learning path or enter a search query before fetching.', 400);
  }

  const filters = {};
  if (country) {
    filters.country = country;
  }
  filters.limit = himalayasJobService.config().maxResults;

  const stats = await importFromSearch(query, filters);
  return {
    ...stats,
    query,
    learningPathId: path ? String(path._id) : null,
    message: importMessage(stats, path ? path.pathName : null),
  };
}

module.exports = {
  searchQueryForPath,
  importFromSearch,
  importFromAdminRequest,
  findExisting,
};
