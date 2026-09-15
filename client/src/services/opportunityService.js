import api from './api.js'

export async function fetchOpportunities(params = {}) {
  const query = {}
  if (params.search) query.search = params.search
  if (params.type) query.type = params.type
  if (params.location) query.location = params.location
  if (params.skill) query.skill = params.skill
  if (params.status) query.status = params.status
  if (params.sort) query.sort = params.sort

  const { data } = await api.get('/opportunities', { params: query })
  return data
}

export async function fetchOpportunity(id) {
  const { data } = await api.get(`/opportunities/${id}`)
  return data
}

export async function fetchSavedOpportunities() {
  const { data } = await api.get('/opportunities/saved')
  return data
}

export async function saveOpportunity(id) {
  const { data } = await api.post(`/opportunities/${id}/save`)
  return data
}

export async function unsaveOpportunity(id) {
  const { data } = await api.delete(`/opportunities/${id}/save`)
  return data
}
