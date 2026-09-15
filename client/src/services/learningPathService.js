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

export async function fetchLearningPathRoadmap(id) {
  const { data } = await api.get(`/learning-paths/${id}/roadmap`)
  return data
}

export async function selectLearningPath(id) {
  const { data } = await api.post(`/learning-paths/${id}/select`)
  return data
}

export async function completeLearningPathStep(pathId, stepId) {
  const { data } = await api.post(`/learning-paths/${pathId}/steps/${stepId}/complete`)
  return data
}
