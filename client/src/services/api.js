import axios from 'axios'
import { TOKEN_KEY } from '../routes/paths.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export function getApiError(error, fallback = 'Something went wrong') {
  return error.response?.data?.message || error.message || fallback
}

export function getFieldErrors(error) {
  const errors = error.response?.data?.errors
  if (!Array.isArray(errors)) {
    return {}
  }

  return errors.reduce((acc, item) => {
    if (item.field) {
      acc[item.field] = item.message
    }
    return acc
  }, {})
}

export default api
