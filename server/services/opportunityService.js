const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const SavedOpportunity = require('../models/SavedOpportunity');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const { parseSkillList, skillMatch, uniqueSkillNames } = require('./opportunitySkillMatch');
const {
  CLOSING_SOON_DAYS,
  STATUS_CLOSED,
  STATUS_CLOSING_SOON,
  STATUS_OPEN,
  addDays,
  deadlineStatus,
  deadlineStatusLabel,
  startOfDay,
} = require('./opportunityStatus');
const { isVisibleToStudents, visibleToStudentsFilter } = require('./opportunityVisibility');

const TYPES = Opportunity.TYPES;
const STATUSES = [STATUS_OPEN, STATUS_CLOSING_SOON, STATUS_CLOSED];
const SORTS = ['match', 'nearest', 'latest'];
const DEFAULT_SORT = 'match';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceLabel(opportunity) {
  if (opportunity.source === Opportunity.SOURCE_HIMALAYAS) {
    return 'Himalayas';
  }
  if (opportunity.source === Opportunity.SOURCE_ORGANIZATION || opportunity.organizationId) {
    return 'Organization';
  }
  return 'PathForge';
}

function hasValidApplicationUrl(url) {
  const value = String(url || '').trim();
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

async function userSkillNamesFor(userId) {
  const records = await UserSkill.find({ user: userId }).populate('skill');
  return uniqueSkillNames(records.map((record) => record.skill && record.skill.name).filter(Boolean));
}

async function skillNamesByOpportunity(opportunityIds) {
  if (!opportunityIds.length) {
    return new Map();
  }

  const rows = await OpportunitySkill.find({ opportunityId: { $in: opportunityIds } }).populate('skillId');
  const map = new Map();

  for (const row of rows) {
    const id = String(row.opportunityId);
    const name = row.skillId && row.skillId.name;
    if (!name) {
      continue;
    }
    if (!map.has(id)) {
      map.set(id, []);
    }
    map.get(id).push(name);
  }

  for (const [id, names] of map.entries()) {
    map.set(id, uniqueSkillNames(names));
  }

  return map;
}

function relevantSkillNames(opportunity, mappedNames) {
  if (mappedNames && mappedNames.length) {
    return mappedNames;
  }
  return uniqueSkillNames(parseSkillList(opportunity.requiredSkills));
}

function decorateOpportunity(opportunity, { userSkills, mappedNames, savedIds }) {
  const required = relevantSkillNames(opportunity, mappedNames);
  const match = skillMatch(userSkills, required);
  const applicationUrl = hasValidApplicationUrl(opportunity.applicationUrl)
    ? opportunity.applicationUrl
    : null;

  return {
    id: String(opportunity._id),
    _id: opportunity._id,
    title: opportunity.title,
    organization: opportunity.organization,
    type: opportunity.type,
    description: opportunity.description ?? null,
    requiredSkills: opportunity.requiredSkills ?? null,
    requiredSkillNames: required,
    eligibility: opportunity.eligibility ?? null,
    deadline: opportunity.deadline ?? null,
    applicationUrl,
    hasValidApplicationUrl: Boolean(applicationUrl),
    location: opportunity.location ?? null,
    source: opportunity.source || null,
    sourceLabel: sourceLabel(opportunity),
    externalId: opportunity.externalId || null,
    sourceUrl: opportunity.sourceUrl || null,
    approvalStatus: opportunity.approvalStatus || Opportunity.APPROVAL_APPROVED,
    organizationId: opportunity.organizationId || null,
    deadlineStatus: deadlineStatus(opportunity.deadline),
    deadlineStatusLabel: deadlineStatusLabel(opportunity.deadline),
    skillMatch: match,
    saved: Boolean(savedIds && savedIds.has(String(opportunity._id))),
    createdAt: opportunity.createdAt,
  };
}

function sortOpportunities(opportunities, sort) {
  const items = [...opportunities];

  if (sort === 'latest') {
    items.sort((left, right) => {
      const leftTime = left.deadline ? new Date(left.deadline).getTime() : 0;
      const rightTime = right.deadline ? new Date(right.deadline).getTime() : 0;
      return rightTime - leftTime;
    });
    return items;
  }

  if (sort === 'nearest') {
    items.sort((left, right) => {
      const leftClosed = left.deadlineStatus === STATUS_CLOSED ? 1 : 0;
      const rightClosed = right.deadlineStatus === STATUS_CLOSED ? 1 : 0;
      if (leftClosed !== rightClosed) {
        return leftClosed - rightClosed;
      }
      const leftTime = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });
    return items;
  }

  items.sort((left, right) => {
    const leftPercent =
      left.skillMatch && left.skillMatch.hasUserSkills ? (left.skillMatch.percent ?? -1) : -1;
    const rightPercent =
      right.skillMatch && right.skillMatch.hasUserSkills ? (right.skillMatch.percent ?? -1) : -1;
    if (leftPercent !== rightPercent) {
      return rightPercent - leftPercent;
    }
    const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftCreated !== rightCreated) {
      return rightCreated - leftCreated;
    }
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  });

  return items;
}

async function skillOptions() {
  const visible = visibleToStudentsFilter();
  const fromText = await Opportunity.find(visible).select('requiredSkills');
  const textNames = fromText.flatMap((item) => parseSkillList(item.requiredSkills));

  const visibleIds = await Opportunity.find(visible).distinct('_id');
  const pivot = await OpportunitySkill.find({ opportunityId: { $in: visibleIds } }).populate('skillId');
  const pivotNames = pivot.map((row) => row.skillId && row.skillId.name).filter(Boolean);

  return uniqueSkillNames([...textNames, ...pivotNames]).sort((left, right) =>
    left.localeCompare(right)
  );
}

async function listForStudent(user, query = {}) {
  const selectedType = TYPES.includes(query.type) ? query.type : null;
  const selectedLocation = String(query.location || '').trim();
  const selectedStatus = STATUSES.includes(query.status) ? query.status : null;
  const selectedSkill = String(query.skill || '').trim();
  const search = String(query.search || query.q || '').trim();
  const sort = SORTS.includes(query.sort) ? query.sort : DEFAULT_SORT;

  const userSkills = await userSkillNamesFor(user.id);
  const savedRows = await SavedOpportunity.find({ userId: user.id }).select('opportunityId');
  const savedIds = new Set(savedRows.map((row) => String(row.opportunityId)));

  const filter = visibleToStudentsFilter();
  const clauses = [filter];

  if (selectedType) {
    clauses.push({ type: selectedType });
  }
  if (selectedLocation) {
    clauses.push({ location: selectedLocation });
  }
  if (selectedSkill) {
    const skillDocs = await Skill.find({
      name: new RegExp(`^${escapeRegex(selectedSkill)}$`, 'i'),
    }).select('_id');
    const skillIds = skillDocs.map((item) => item._id);
    const linked = skillIds.length
      ? await OpportunitySkill.find({ skillId: { $in: skillIds } }).distinct('opportunityId')
      : [];
    clauses.push({
      $or: [
        { requiredSkills: { $regex: escapeRegex(selectedSkill), $options: 'i' } },
        { _id: { $in: linked } },
      ],
    });
  }
  if (search) {
    const term = new RegExp(escapeRegex(search), 'i');
    clauses.push({
      $or: [{ title: term }, { organization: term }, { type: term }, { requiredSkills: term }],
    });
  }

  const today = startOfDay(new Date());
  const soon = addDays(today, CLOSING_SOON_DAYS);
  if (selectedStatus === STATUS_CLOSED) {
    clauses.push({ deadline: { $ne: null, $lt: today } });
  } else if (selectedStatus === STATUS_CLOSING_SOON) {
    clauses.push({ deadline: { $ne: null, $gte: today, $lte: soon } });
  } else if (selectedStatus === STATUS_OPEN) {
    clauses.push({
      $or: [{ deadline: null }, { deadline: { $gt: soon } }],
    });
  }

  const mongoFilter = clauses.length === 1 ? clauses[0] : { $and: clauses };
  const docs = await Opportunity.find(mongoFilter);
  const mapped = await skillNamesByOpportunity(docs.map((item) => item._id));
  const decorated = docs.map((doc) =>
    decorateOpportunity(doc, {
      userSkills,
      mappedNames: mapped.get(String(doc._id)),
      savedIds,
    })
  );

  const locations = await Opportunity.find(visibleToStudentsFilter())
    .distinct('location')
    .then((values) => values.filter((value) => value && String(value).trim()).sort());

  return {
    opportunities: sortOpportunities(decorated, sort),
    types: TYPES,
    selectedType,
    selectedLocation,
    selectedStatus,
    selectedSkill,
    sort,
    search,
    locations,
    skillOptions: await skillOptions(),
    hasUserSkills: userSkills.length > 0,
    savedIds: [...savedIds],
    totalCount: await Opportunity.countDocuments(visibleToStudentsFilter()),
    hasFilters: Boolean(
      selectedType || selectedLocation || selectedStatus || selectedSkill || search
    ),
  };
}

async function listSavedForStudent(user) {
  const userSkills = await userSkillNamesFor(user.id);
  const savedRows = await SavedOpportunity.find({ userId: user.id }).sort({
    savedAt: -1,
    _id: -1,
  });
  const ids = savedRows.map((row) => row.opportunityId);
  const docs = await Opportunity.find({
    _id: { $in: ids },
    ...visibleToStudentsFilter(),
  });
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const mapped = await skillNamesByOpportunity(docs.map((item) => item._id));
  const savedIds = new Set(ids.map(String));

  return savedRows
    .map((row) => byId.get(String(row.opportunityId)))
    .filter(Boolean)
    .map((doc) =>
      decorateOpportunity(doc, {
        userSkills,
        mappedNames: mapped.get(String(doc._id)),
        savedIds,
      })
    );
}

async function getVisibleForStudent(user, opportunityId) {
  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity || !isVisibleToStudents(opportunity)) {
    return null;
  }

  const userSkills = await userSkillNamesFor(user.id);
  const saved = await SavedOpportunity.exists({
    userId: user.id,
    opportunityId: opportunity._id,
  });
  const mapped = await skillNamesByOpportunity([opportunity._id]);

  return decorateOpportunity(opportunity, {
    userSkills,
    mappedNames: mapped.get(String(opportunity._id)),
    savedIds: saved ? new Set([String(opportunity._id)]) : new Set(),
  });
}

module.exports = {
  TYPES,
  STATUSES,
  SORTS,
  DEFAULT_SORT,
  sourceLabel,
  hasValidApplicationUrl,
  userSkillNamesFor,
  relevantSkillNames,
  decorateOpportunity,
  sortOpportunities,
  listForStudent,
  listSavedForStudent,
  getVisibleForStudent,
};
