import api from './api.js'

export async function fetchAiStudio() {
  const { data } = await api.get('/ai-studio')
  return data
}

export async function sendAiStudioMessage(message) {
  const { data } = await api.post('/ai-studio/chat', { message }, { timeout: 90000 })
  return data
}
