import { useEffect, useState } from 'react'
import { fetchHealth } from '../services/healthService.js'

export function useHealth() {
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchHealth()
        if (!cancelled) {
          setState({ status: 'success', data, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error:
              error.response?.data?.message ||
              error.message ||
              'Unable to reach the PathForge API',
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
