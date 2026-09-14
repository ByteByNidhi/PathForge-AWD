import api from './api.js'

export async function fetchProfile() {
  const { data } = await api.get('/users/me')
  return data
}

export async function updateProfile(payload) {
  const { data } = await api.patch('/users/me', payload)
  return data
}
