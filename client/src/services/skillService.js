import api from './api.js'

export async function fetchSkills() {
  const { data } = await api.get('/skills')
  return data
}

export async function fetchRelevantSkills(learningPathId) {
  const { data } = await api.get('/skills/relevant', {
    params: { learningPathId },
  })
  return data
}

export async function fetchMySkills() {
  const { data } = await api.get('/skills/me')
  return data
}

export async function assignMySkills(skillIds, skillNames) {
  const payload = {}
  if (Array.isArray(skillIds) && skillIds.length) {
    payload.skillIds = skillIds
  }
  if (Array.isArray(skillNames) && skillNames.length) {
    payload.skillNames = skillNames
  } else if (typeof skillNames === 'string' && skillNames.trim()) {
    payload.skillName = skillNames.trim()
  }
  const { data } = await api.post('/skills/me', payload)
  return data
}

export async function removeMySkill(skillId) {
  const { data } = await api.delete(`/skills/me/${skillId}`)
  return data
}
