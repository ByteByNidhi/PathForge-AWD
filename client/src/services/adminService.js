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
