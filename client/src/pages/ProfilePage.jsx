import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Input from '../components/ui/Input.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import SkillManager from '../components/skills/SkillManager.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getApiError, getFieldErrors } from '../services/api.js'
import { assignMySkills, fetchMySkills, fetchSkills, removeMySkill } from '../services/skillService.js'
import { fetchProfile, updateProfile } from '../services/userService.js'
import { PATHS } from '../routes/paths.js'

function ProfilePage() {
  const { setUser } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [skillError, setSkillError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [progression, setProgression] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', location: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [skillSaving, setSkillSaving] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const [data, mine, catalog] = await Promise.all([fetchProfile(), fetchMySkills(), fetchSkills()])
      setProfile(data.user)
      setProgression(data.progression || null)
      setSkills(mine.skills || data.skills || [])
      setCatalogue(catalog.skills || [])
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

  const refreshSkills = async () => {
    const mine = await fetchMySkills()
    setSkills(mine.skills || [])
  }

  const addCatalogue = async (skillId) => {
    setSkillSaving(true)
    setSkillError('')
    try {
      await assignMySkills([skillId])
      await refreshSkills()
    } catch (err) {
      setSkillError(getApiError(err, 'Unable to add skill'))
    } finally {
      setSkillSaving(false)
    }
  }

  const addCustom = async (name) => {
    setSkillSaving(true)
    setSkillError('')
    try {
      await assignMySkills(undefined, name)
      await refreshSkills()
    } catch (err) {
      setSkillError(getApiError(err, 'Unable to add skill'))
    } finally {
      setSkillSaving(false)
    }
  }

  const removeSkill = async (skillId) => {
    setSkillSaving(true)
    setSkillError('')
    try {
      await removeMySkill(skillId)
      setSkills((current) => current.filter((skill) => String(skill._id) !== String(skillId)))
    } catch (err) {
      setSkillError(getApiError(err, 'Unable to remove skill'))
    } finally {
      setSkillSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading profile" message="Fetching your account details." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  const careerLabel =
    profile.learningPath?.pathName ||
    profile.learningPath?.title ||
    (profile.careerPathRequest?.requestedPath
      ? `Requested: ${profile.careerPathRequest.requestedPath}`
      : 'None selected')

  return (
    <div className="profile-page">
      <PageHeader
        eyebrow="Profile"
        title="Your PathForge identity"
        description="Name, email, location, bio, and skills. Role and XP are earned, not edited here."
      />

      <div className="profile-layout">
        <div className="page-stack">
          <Card className="profile-identity">
            <p className="pf-eyebrow">Identity</p>
            <h2>{profile.name}</h2>
            <p className="pf-muted">{profile.email}</p>
            <div className="profile-identity__meta">
              <Badge>{profile.role}</Badge>
              <Badge tone="info">Level {progression?.level ?? profile.level}</Badge>
              <Badge tone="success">{progression?.totalXp ?? profile.xp ?? 0} XP</Badge>
            </div>
            <dl className="profile-dl">
              <div>
                <dt>Career path</dt>
                <dd>{careerLabel}</dd>
              </div>
              <div>
                <dt>Roadmap</dt>
                <dd>
                  {progression?.totalPublishedSteps
                    ? `${progression.progressPercent}% · ${progression.completedSteps}/${progression.totalPublishedSteps} steps`
                    : 'No published steps on this path yet'}
                </dd>
              </div>
            </dl>
            {progression?.totalPublishedSteps ? (
              <ProgressBar value={progression.progressPercent} max={100} />
            ) : null}
            <p style={{ marginTop: '1.25rem' }}>
              <Link to={PATHS.ROADMAP} className="pf-btn pf-btn-secondary">Open roadmap</Link>
            </p>
          </Card>

          <Card>
            <p className="pf-eyebrow">Account details</p>
            <h2 style={{ margin: '0.5rem 0 1rem' }}>Edit profile</h2>
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
        </div>

        <Card>
          <p className="pf-eyebrow">Manage skills</p>
          <h2 style={{ margin: '0.5rem 0 0.75rem' }}>Catalogue and custom skills</h2>
          <p className="pf-muted" style={{ marginBottom: '1.25rem' }}>
            PathForge keeps one identity per skill. Typing “git” selects catalogue Git instead of
            creating a second record.
          </p>
          <SkillManager
            mine={skills}
            catalogue={catalogue}
            saving={skillSaving}
            error={skillError}
            onAddCatalogue={addCatalogue}
            onAddCustom={addCustom}
            onRemove={removeSkill}
          />
        </Card>
      </div>
    </div>
  )
}

export default ProfilePage
