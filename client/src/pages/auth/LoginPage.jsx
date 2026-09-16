import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import BrandMark from '../../components/BrandMark.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import { getPostAuthPath } from '../../utils/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const next = {}
    if (!form.email.trim()) next.email = 'Email is required'
    if (!form.password) next.password = 'Password is required'
    setFieldErrors(next)
    if (Object.keys(next).length) {
      return
    }

    setSubmitting(true)
    try {
      const user = await login(form)
      navigate(getPostAuthPath(user), { replace: true })
    } catch (err) {
      setError(getApiError(err, 'Unable to sign in'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="auth-visual__brand">
          <BrandMark className="auth-visual__logo" />
          <span className="auth-visual__name">PathForge</span>
        </div>
        <div>
          <p className="pf-eyebrow" style={{ color: 'var(--color-brand-sage-soft)' }}>
            Career + learning
          </p>
          <h1>Forge a path you can actually follow.</h1>
          <p>Sign in to continue your career map, skills, and next steps.</p>
        </div>
        <p className="auth-visual__note">A quieter way to plan what comes next.</p>
      </section>

      <main className="auth-panel">
        <Card className="auth-card">
          <p className="pf-eyebrow">Welcome back</p>
          <h2>Sign in</h2>
          <p className="pf-muted">Use the email and password for your PathForge account.</p>

          <form className="auth-form" onSubmit={onSubmit}>
            {error ? <div className="pf-form-alert">{error}</div> : null}
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              value={form.email}
              onChange={onChange}
              error={fieldErrors.email}
            />
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              value={form.password}
              onChange={onChange}
              error={fieldErrors.password}
            />
            <Button type="submit" block disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="auth-switch">
            New to PathForge? <Link to={PATHS.REGISTER}>Create an account</Link>
          </p>
        </Card>
      </main>
    </div>
  )
}

export default LoginPage
