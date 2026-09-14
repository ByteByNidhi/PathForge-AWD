import api from './api.js'

export async function fetchLearningPaths() {
  const { data } = await api.get('/learning-paths')
  return data
}

export async function fetchLearningPath(id) {
  const { data } = await api.get(`/learning-paths/${id}`)
  return data
}

export async function fetchLearningPathSkills(id) {
  const { data } = await api.get(`/learning-paths/${id}/skills`)
  return data
}
