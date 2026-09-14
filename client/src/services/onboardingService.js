import api from './api.js'

export async function fetchOnboarding() {
  const { data } = await api.get('/onboarding')
  return data
}

export async function completeOnboarding(payload) {
  const { data } = await api.post('/onboarding/complete', payload)
  return data
}
