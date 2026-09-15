function normalizeHaystack(text) {
  let value = String(text || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ');
  value = value.replace(/[-_/\\.]/g, ' ');
  value = value.replace(/[^a-z0-9+# ]+/g, ' ');
  value = value.replace(/\s+/g, ' ');
  return value.trim();
}

function tokensFor(skillName) {
  const name = String(skillName || '')
    .toLowerCase()
    .trim();
  const tokens = [normalizeHaystack(name)];

  const aliases = {
    javascript: ['javascript'],
    'ui ux design': ['ui ux design', 'ui ux', 'ux design', 'ui design'],
    cybersecurity: ['cybersecurity', 'cyber security'],
    'machine learning': ['machine learning'],
  };

  const key = normalizeHaystack(name);
  if (aliases[key]) {
    tokens.push(...aliases[key]);
  }

  return [...new Set(tokens.filter((token) => token && token.length >= 2))];
}

function containsToken(haystack, token) {
  if (!token) {
    return false;
  }
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^| )${escaped}( |$)`, 'u');
  return pattern.test(haystack);
}

function skillMatches(skillName, normalizedHaystack) {
  return tokensFor(skillName).some((token) => containsToken(normalizedHaystack, token));
}

function matchCatalogSkills(text, skills) {
  const haystack = normalizeHaystack(text);
  if (!haystack) {
    return [];
  }
  return (skills || []).filter((skill) => skillMatches(skill.name, haystack));
}

module.exports = {
  normalizeHaystack,
  tokensFor,
  containsToken,
  skillMatches,
  matchCatalogSkills,
};
