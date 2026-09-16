const Skill = require('../models/Skill');
const LearningPath = require('../models/LearningPath');
const AppError = require('../utils/AppError');
const { slugify, escapeRegex } = require('../utils/slugify');

const SKILL_NAME_MIN = 2;
const SKILL_NAME_MAX = 100;

function normalizeSkillName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function skillNameKey(value) {
  return normalizeSkillName(value).toLowerCase();
}

function validateSkillName(rawName) {
  const name = normalizeSkillName(rawName);
  if (!name) {
    return 'Enter a skill name';
  }
  if (name.length < SKILL_NAME_MIN || name.length > SKILL_NAME_MAX) {
    return `Enter a skill name between ${SKILL_NAME_MIN} and ${SKILL_NAME_MAX} characters`;
  }
  return null;
}

function collectSkillNames(body = {}) {
  const names = [];
  if (Array.isArray(body.skillNames)) {
    names.push(...body.skillNames);
  }
  if (body.skillName) {
    names.push(body.skillName);
  }
  if (body.name && !((Array.isArray(body.skillIds) && body.skillIds.length) || body.skillId)) {
    names.push(body.name);
  }
  return names.map(normalizeSkillName).filter(Boolean);
}

async function findSkillsByNormalizedName(rawName) {
  const name = normalizeSkillName(rawName);
  if (!name) {
    return [];
  }
  return Skill.find({
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  }).sort({ createdAt: 1, _id: 1 });
}

async function pickCanonicalSkill(matches) {
  if (!matches.length) {
    return null;
  }
  if (matches.length === 1) {
    return matches[0];
  }

  const ids = matches.map((skill) => skill._id);
  const path = await LearningPath.findOne({ skills: { $in: ids } }).select('skills');
  if (path) {
    const preferred = matches.find((skill) =>
      (path.skills || []).some((id) => String(id) === String(skill._id))
    );
    if (preferred) {
      return preferred;
    }
  }

  return matches[0];
}

async function findCanonicalSkillByName(rawName) {
  const matches = await findSkillsByNormalizedName(rawName);
  return pickCanonicalSkill(matches);
}

async function findOrCreateSkillByName(rawName) {
  const nameError = validateSkillName(rawName);
  if (nameError) {
    throw new AppError(nameError, 400, [{ field: 'skillName', message: nameError }]);
  }

  const name = normalizeSkillName(rawName);
  const existing = await findCanonicalSkillByName(name);
  if (existing) {
    return existing;
  }

  let base = slugify(name) || 'skill';
  let slug = base;
  let suffix = 2;
  while (await Skill.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  try {
    return await Skill.create({ name, slug, category: '' });
  } catch (error) {
    if (error && error.code === 11000) {
      const raced = await findCanonicalSkillByName(name);
      if (raced) {
        return raced;
      }
      const bySlug = await Skill.findOne({ slug });
      if (bySlug) {
        return bySlug;
      }
    }
    throw error;
  }
}

async function resolveSkillIds({ skillIds = [], skillNames = [] } = {}) {
  const ids = [];
  const seen = new Set();

  for (const id of skillIds) {
    const key = String(id);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    ids.push(key);
  }

  for (const name of skillNames) {
    const skill = await findOrCreateSkillByName(name);
    const key = String(skill._id);
    if (!seen.has(key)) {
      seen.add(key);
      ids.push(key);
    }
  }

  return ids;
}

async function reportDuplicateSkillGroups() {
  const skills = await Skill.find().select('name slug createdAt').sort({ createdAt: 1 });
  const groups = new Map();

  for (const skill of skills) {
    const key = skillNameKey(skill.name);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push({
      id: String(skill._id),
      name: skill.name,
      slug: skill.slug,
      createdAt: skill.createdAt,
    });
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

module.exports = {
  SKILL_NAME_MIN,
  SKILL_NAME_MAX,
  normalizeSkillName,
  skillNameKey,
  validateSkillName,
  collectSkillNames,
  findSkillsByNormalizedName,
  findCanonicalSkillByName,
  findOrCreateSkillByName,
  resolveSkillIds,
  reportDuplicateSkillGroups,
};
