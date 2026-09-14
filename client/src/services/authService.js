import api from './api.js'

export async function registerAccount(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function loginAccount(payload) {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me')
  return data
}
