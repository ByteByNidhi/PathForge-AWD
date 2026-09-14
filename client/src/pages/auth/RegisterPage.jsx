import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandMark from '../../components/BrandMark.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getPostAuthPath } from '../../utils/auth.js'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'

const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const validateClient = () => {
    const next = {}
    const name = form.name.trim().replace(/\s+/g, ' ')
    if (!name) next.name = 'Full name is required'
    else if (!NAME_PATTERN.test(name)) next.name = 'Full name may contain letters and spaces only'
    if (!form.email.trim()) next.email = 'Email is required'
    if (!form.password) next.password = 'Password is required'
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters'
    if (form.password !== form.passwordConfirmation) {
      next.passwordConfirmation = 'Password confirmation does not match'
    }
    return next
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const clientErrors = validateClient()
    setFieldErrors(clientErrors)
    if (Object.keys(clientErrors).length) {
      return
    }

    setSubmitting(true)
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
      })
      navigate(getPostAuthPath(user), { replace: true })
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getApiError(err, 'Unable to create your account'))
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
            Start here
          </p>
          <h1>Create a PathForge account.</h1>
          <p>Registration takes you into onboarding so your career path and skills are set with intention.</p>
        </div>
        <p className="auth-visual__note">No social login. One account, one path.</p>
      </section>

      <main className="auth-panel">
        <Card className="auth-card">
          <p className="pf-eyebrow">New student</p>
          <h2>Create account</h2>
          <p className="pf-muted">Use your full name and a password you can remember.</p>

          <form className="auth-form" onSubmit={onSubmit}>
            {error ? <div className="pf-form-alert">{error}</div> : null}
            <Input
              id="name"
              name="name"
              label="Full name"
              autoComplete="name"
              value={form.name}
              onChange={onChange}
              error={fieldErrors.name}
            />
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
              autoComplete="new-password"
              value={form.password}
              onChange={onChange}
              error={fieldErrors.password}
            />
            <Input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              label="Confirm password"
              autoComplete="new-password"
              value={form.passwordConfirmation}
              onChange={onChange}
              error={fieldErrors.passwordConfirmation}
            />
            <Button type="submit" block disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to={PATHS.LOGIN}>Sign in</Link>
          </p>
        </Card>
      </main>
    </div>
  )
}

export default RegisterPage
