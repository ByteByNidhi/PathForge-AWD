import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PATHS } from '../routes/paths.js'
import { getApiError } from '../services/api.js'
import { fetchProfile } from '../services/userService.js'

function DashboardPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchProfile()
      setProfile(data.user)
      setSkills(data.skills || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load dashboard'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (status === 'loading') {
    return <LoadingState title="Loading dashboard" message="Fetching your PathForge profile." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  const careerLabel = profile?.learningPath?.title
    || (profile?.careerPathRequest?.requestedPath
      ? `Requested: ${profile.careerPathRequest.requestedPath}`
      : 'No career path selected')

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hello, ${user?.name?.split(' ')[0] || 'there'}`}
        description="This is your PathForge home. Roadmap progress, opportunities, and achievements will appear here when those systems are live."
      />

      <div className="page-grid">
        <Card style={{ padding: '1.5rem' }}>
          <p className="pf-eyebrow">Career path</p>
          <h2 style={{ marginTop: '0.5rem' }}>{careerLabel}</h2>
          {profile?.careerPathRequest ? (
            <p style={{ marginTop: '0.75rem' }}>
              <Badge tone="warning">{profile.careerPathRequest.status}</Badge>
            </p>
          ) : null}
        </Card>
        <Card style={{ padding: '1.5rem' }}>
          <p className="pf-eyebrow">Progress</p>
          <h2 style={{ marginTop: '0.5rem' }}>Level {profile?.level ?? 1}</h2>
          <p className="pf-muted" style={{ marginTop: '0.5rem' }}>
            {profile?.xp ?? 0} XP. Completing onboarding does not award XP.
          </p>
        </Card>
      </div>

      <div className="page-stack" style={{ marginTop: '1.25rem' }}>
        {skills.length ? (
          <Card style={{ padding: '1.5rem' }}>
            <p className="pf-eyebrow">Skills</p>
            <div className="skills-list" style={{ marginTop: '1rem' }}>
              {skills.map((skill) => (
                <span key={skill._id} className="skill-pill">{skill.name}</span>
              ))}
            </div>
            <p style={{ marginTop: '1rem' }}>
              <Link to={PATHS.SKILLS} className="pf-muted">Manage skills</Link>
            </p>
          </Card>
        ) : (
          <EmptyState
            title="No skills yet"
            message={
              profile?.isBeginner
                ? 'You started as a beginner. Add catalogue skills when you are ready.'
                : 'You have not assigned catalogue skills. You can add them from Profile.'
            }
            action={
              <Link to={PATHS.SKILLS} className="pf-btn pf-btn-primary">Manage skills</Link>
            }
          />
        )}

        <EmptyState
          title="Roadmap not available yet"
          message="Roadmap steps will appear in a later sprint. Beginners will start from Step 1."
        />
      </div>
    </div>
  )
}

export default DashboardPage
