import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Input from '../components/ui/Input.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getApiError, getFieldErrors } from '../services/api.js'
import { fetchProfile, updateProfile } from '../services/userService.js'
import { PATHS } from '../routes/paths.js'

function ProfilePage() {
  const { setUser } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', location: '', bio: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchProfile()
      setProfile(data.user)
      setForm({
        name: data.user.name || '',
        email: data.user.email || '',
        location: data.user.profile?.location || '',
        bio: data.user.profile?.bio || '',
      })
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load profile'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    try {
      const data = await updateProfile(form)
      setProfile(data.user)
      setUser(data.user)
      setMessage('Profile saved')
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getApiError(err, 'Unable to save profile'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading profile" message="Fetching your account details." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Profile"
        title="Your details"
        description="Name, email, location, and bio can be updated. Role and XP cannot be changed here."
      />

      <div className="page-grid">
        <Card style={{ padding: '1.5rem' }}>
          <form className="profile-form" onSubmit={onSubmit}>
            {error ? <div className="pf-form-alert">{error}</div> : null}
            {message ? <p className="pf-muted">{message}</p> : null}
            <Input id="name" name="name" label="Full name" value={form.name} onChange={onChange} error={fieldErrors.name} />
            <Input id="email" name="email" type="email" label="Email" value={form.email} onChange={onChange} error={fieldErrors.email} />
            <Input
              id="location"
              name="location"
              label="Location"
              value={form.location}
              onChange={onChange}
              error={fieldErrors.location}
            />
            <label className="pf-field" htmlFor="bio">
              <span className="pf-label">Bio</span>
              <textarea id="bio" name="bio" className="pf-textarea" value={form.bio} onChange={onChange} />
              {fieldErrors.bio ? <span className="pf-field-error">{fieldErrors.bio}</span> : null}
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <Card style={{ padding: '1.5rem' }}>
          <p className="pf-eyebrow">Account</p>
          <h2 style={{ marginTop: '0.5rem' }}>{profile.name}</h2>
          <p className="pf-muted" style={{ marginTop: '0.5rem' }}>{profile.email}</p>
          <p style={{ marginTop: '1rem' }}>
            <Badge>{profile.role}</Badge>{' '}
            <Badge tone="info">Level {profile.level}</Badge>
          </p>
          <p className="pf-muted" style={{ marginTop: '1rem' }}>
            Career path:{' '}
            {profile.learningPath?.title ||
              profile.careerPathRequest?.requestedPath ||
              'None'}
          </p>
          <p style={{ marginTop: '1rem' }}>
            <Link to={PATHS.SKILLS} className="pf-muted">Manage skills</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default ProfilePage
