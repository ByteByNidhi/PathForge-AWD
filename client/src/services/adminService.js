import api from './api.js'

export async function fetchAdminDashboard() {
  const { data } = await api.get('/admin')
  return data
}

export async function fetchAdminOpportunities(params = {}) {
  const { data } = await api.get('/admin/opportunities', { params })
  return data
}

export async function fetchHimalayasOpportunities(payload) {
  const { data } = await api.post('/admin/opportunities/himalayas/fetch', payload)
  return data
}

export async function fetchAdminOpportunity(id) {
  const { data } = await api.get(`/admin/opportunities/${id}`)
  return data
}

export async function createAdminOpportunity(payload) {
  const { data } = await api.post('/admin/opportunities', payload)
  return data
}

export async function updateAdminOpportunity(id, payload) {
  const { data } = await api.patch(`/admin/opportunities/${id}`, payload)
  return data
}

export async function approveAdminOpportunity(id) {
  const { data } = await api.post(`/admin/opportunities/${id}/approve`)
  return data
}

export async function rejectAdminOpportunity(id, payload) {
  const { data } = await api.post(`/admin/opportunities/${id}/reject`, payload)
  return data
}

export async function deleteAdminOpportunity(id) {
  const { data } = await api.delete(`/admin/opportunities/${id}`)
  return data
}

export async function fetchAdminOrganizations() {
  const { data } = await api.get('/admin/organizations')
  return data
}

export async function createAdminOrganization(payload) {
  const { data } = await api.post('/admin/organizations', payload)
  return data
}

export async function fetchAdminCareerPathRequests() {
  const { data } = await api.get('/admin/career-path-requests')
  return data
}

export async function reviewAdminCareerPathRequests(payload) {
  const { data } = await api.post('/admin/career-path-requests/review', payload)
  return data
}

export async function fetchAdminRoadmaps() {
  const { data } = await api.get('/admin/roadmaps')
  return data
}

export async function fetchAdminRoadmap(id) {
  const { data } = await api.get(`/admin/roadmaps/${id}`)
  return data
}

export async function generateAdminRoadmap(id, payload) {
  const { data } = await api.post(`/admin/roadmaps/${id}/generate`, payload, { timeout: 60000 })
  return data
}

export async function fetchAdminRoadmapPreview(id) {
  const { data } = await api.get(`/admin/roadmaps/${id}/preview`)
  return data
}

export async function publishAdminRoadmap(id) {
  const { data } = await api.post(`/admin/roadmaps/${id}/publish`)
  return data
}

export async function createAdminRoadmapStep(pathId, payload) {
  const { data } = await api.post(`/admin/roadmaps/${pathId}/steps`, payload)
  return data
}

export async function updateAdminRoadmapStep(pathId, stepId, payload) {
  const { data } = await api.put(`/admin/roadmaps/${pathId}/steps/${stepId}`, payload)
  return data
}

export async function deleteAdminRoadmapStep(pathId, stepId) {
  const { data } = await api.delete(`/admin/roadmaps/${pathId}/steps/${stepId}`)
  return data
}

export async function fetchAdminUsers() {
  const { data } = await api.get('/admin/users')
  return data
}

export async function fetchAdminUser(id) {
  const { data } = await api.get(`/admin/users/${id}`)
  return data
}

export async function fetchAdminSubscriptions() {
  const { data } = await api.get('/admin/subscriptions')
  return data
}

export async function fetchAdminSubscription(id) {
  const { data } = await api.get(`/admin/subscriptions/${id}`)
  return data
}

export async function upgradeAdminSubscription(id) {
  const { data } = await api.post(`/admin/subscriptions/${id}/upgrade`)
  return data
}
