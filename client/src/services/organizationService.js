import api from './api.js'

export async function fetchOrganizationDashboard() {
  const { data } = await api.get('/organization')
  return data
}

export async function fetchOrganizationProfile() {
  const { data } = await api.get('/organization/profile')
  return data
}

export async function updateOrganizationProfile(payload) {
  const { data } = await api.put('/organization/profile', payload)
  return data
}

export async function fetchOrganizationMembers() {
  const { data } = await api.get('/organization/members')
  return data
}

export async function addOrganizationMember(payload) {
  const { data } = await api.post('/organization/members', payload)
  return data
}

export async function updateOrganizationMember(userId, payload) {
  const { data } = await api.patch(`/organization/members/${userId}`, payload)
  return data
}

export async function removeOrganizationMember(userId) {
  const { data } = await api.delete(`/organization/members/${userId}`)
  return data
}

export async function fetchOrganizationOpportunities() {
  const { data } = await api.get('/organization/opportunities')
  return data
}

export async function fetchOrganizationOpportunity(id) {
  const { data } = await api.get(`/organization/opportunities/${id}`)
  return data
}

export async function createOrganizationOpportunity(payload) {
  const { data } = await api.post('/organization/opportunities', payload)
  return data
}

export async function updateOrganizationOpportunity(id, payload) {
  const { data } = await api.patch(`/organization/opportunities/${id}`, payload)
  return data
}

export async function submitOrganizationOpportunity(id) {
  const { data } = await api.post(`/organization/opportunities/${id}/submit`)
  return data
}

export async function deleteOrganizationOpportunity(id) {
  const { data } = await api.delete(`/organization/opportunities/${id}`)
  return data
}
