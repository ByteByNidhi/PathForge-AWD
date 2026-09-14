import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { TOKEN_KEY } from '../routes/paths.js'
import { fetchCurrentUser, loginAccount, registerAccount } from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(token ? 'loading' : 'anonymous')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!token) {
        setUser(null)
        setStatus('anonymous')
        return
      }

      try {
        const data = await fetchCurrentUser()
        if (!cancelled) {
          setUser(data.user)
          setStatus('authenticated')
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
          setStatus('anonymous')
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [token])

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
    setStatus('authenticated')
  }

  const login = async (payload) => {
    const data = await loginAccount(payload)
    persistSession(data.token, data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await registerAccount(payload)
    persistSession(data.token, data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }

  const refreshUser = async () => {
    const data = await fetchCurrentUser()
    setUser(data.user)
    return data.user
  }

  const value = useMemo(
    () => ({
      token,
      user,
      status,
      login,
      register,
      logout,
      setUser,
      refreshUser,
    }),
    [token, user, status]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
