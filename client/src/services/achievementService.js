import api from './api.js'

export async function fetchAchievements() {
  const { data } = await api.get('/achievements')
  return data
}
