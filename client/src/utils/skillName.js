export function normalizeSkillName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function skillNameKey(value) {
  return normalizeSkillName(value).toLowerCase()
}

export function findSkillByNormalizedName(skills, rawName) {
  const key = skillNameKey(rawName)
  if (!key) {
    return null
  }
  return (skills || []).find((skill) => skillNameKey(skill.name) === key) || null
}

export function skillId(skill) {
  return String(skill?._id || skill?.id || '')
}

export const SKILL_NAME_MIN = 2
export const SKILL_NAME_MAX = 100

export function validateSkillName(rawName) {
  const name = normalizeSkillName(rawName)
  if (!name) {
    return 'Enter a skill name'
  }
  if (name.length < SKILL_NAME_MIN || name.length > SKILL_NAME_MAX) {
    return `Enter a skill name between ${SKILL_NAME_MIN} and ${SKILL_NAME_MAX} characters`
  }
  return null
}
