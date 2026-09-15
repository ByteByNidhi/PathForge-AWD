function parseSkillList(raw) {
  if (raw == null || String(raw).trim() === '') {
    return [];
  }

  return String(raw)
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueSkillNames(names) {
  const unique = [];
  const seen = new Set();

  for (const name of names || []) {
    if (typeof name !== 'string' && typeof name !== 'number') {
      continue;
    }
    const trimmed = String(name).trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}

function requiredSkillMatchesUser(requiredToken, normalizedUserSkills) {
  const requiredLower = requiredToken.toLowerCase();

  for (const userSkill of normalizedUserSkills) {
    if (userSkill === requiredLower) {
      return true;
    }

    const escaped = String(userSkill).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundary = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (boundary.test(requiredToken)) {
      return true;
    }
  }

  return false;
}

function skillMatch(userSkillNames, requiredSkillNames) {
  const required = uniqueSkillNames(requiredSkillNames);
  const userSkills = uniqueSkillNames(userSkillNames);
  const normalizedUserSkills = userSkills.map((name) => name.toLowerCase());

  if (normalizedUserSkills.length === 0) {
    return {
      hasUserSkills: false,
      percent: null,
      matched: [],
      missing: required,
    };
  }

  if (required.length === 0) {
    return {
      hasUserSkills: true,
      percent: null,
      matched: [],
      missing: [],
    };
  }

  const matched = [];
  const missing = [];

  for (const skill of required) {
    if (requiredSkillMatchesUser(skill, normalizedUserSkills)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return {
    hasUserSkills: true,
    percent: Math.round((matched.length / required.length) * 100),
    matched,
    missing,
  };
}

module.exports = {
  parseSkillList,
  uniqueSkillNames,
  requiredSkillMatchesUser,
  skillMatch,
};
