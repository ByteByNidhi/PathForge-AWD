import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PATHS } from '../routes/paths.js'
import { getApiError } from '../services/api.js'
import { fetchProfile } from '../services/userService.js'

function DashboardPage() {
  const { user, setUser } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])
  const [progression, setProgression] = useState(null)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchProfile()
      setProfile(data.user)
      setSkills(data.skills || [])
      setProgression(data.progression || null)
      if (data.user) {
        setUser(data.user)
      }
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

  const careerLabel = progression?.learningPath?.pathName
    || profile?.learningPath?.title
    || (profile?.careerPathRequest?.requestedPath
      ? `Requested: ${profile.careerPathRequest.requestedPath}`
      : 'No career path selected')
  const totalXp = progression?.totalXp ?? profile?.xp ?? 0
  const level = progression?.level ?? profile?.level ?? 1
  const xpIntoLevel = progression?.xpIntoLevel ?? profile?.xpIntoLevel ?? 0
  const currentStep = progression?.currentStep
  const roadmapCompleted = Boolean(progression?.roadmapCompleted)

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hello, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Your selected path, XP, and current roadmap step live here."
      />

      <div className="dashboard-grid">
        <Card className="dashboard-hero">
          <p className="pf-eyebrow">Career path</p>
          <h2>{careerLabel}</h2>
          {profile?.careerPathRequest ? (
            <p style={{ marginTop: '0.75rem' }}>
              <Badge tone="warning">{profile.careerPathRequest.status}</Badge>
            </p>
          ) : null}
          {progression?.learningPath?.description ? (
            <p className="pf-muted" style={{ marginTop: '0.75rem' }}>
              {progression.learningPath.description}
            </p>
          ) : null}
        </Card>

        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Level</p>
          <h2>Level {level}</h2>
          <p className="pf-muted" style={{ marginTop: '0.5rem' }}>{totalXp} XP total</p>
          <div style={{ marginTop: '1rem' }}>
            <ProgressBar
              value={xpIntoLevel}
              max={100}
              label={`${xpIntoLevel} / 100 XP in this level`}
            />
          </div>
        </Card>

        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Roadmap</p>
          {progression?.totalPublishedSteps ? (
            <>
              <h2>{progression.progressPercent}%</h2>
              <p className="pf-muted" style={{ marginTop: '0.5rem' }}>
                {progression.completedSteps} / {progression.totalPublishedSteps} published steps
              </p>
              <div style={{ marginTop: '1rem' }}>
                <ProgressBar value={progression.progressPercent} max={100} />
              </div>
            </>
          ) : (
            <p className="pf-muted" style={{ marginTop: '0.5rem' }}>
              {progression?.learningPath
                ? 'This path has no published steps yet.'
                : 'Select a career path to track roadmap progress.'}
            </p>
          )}
        </Card>
      </div>

      <div className="dashboard-panels">
        <Card className="dashboard-quest">
          <p className="pf-eyebrow">Current quest</p>
          {roadmapCompleted ? (
            <>
              <h2>Roadmap completed</h2>
              <p className="pf-muted" style={{ marginTop: '0.75rem' }}>
                Every published step on this path is complete.
              </p>
              <div style={{ marginTop: '1.25rem' }}>
                <Link to={PATHS.ROADMAP} className="pf-btn pf-btn-secondary">View roadmap</Link>
              </div>
            </>
          ) : currentStep ? (
            <>
              <h2>Step {currentStep.stepNo}. {currentStep.title}</h2>
              {currentStep.description ? (
                <p className="pf-muted" style={{ marginTop: '0.75rem' }}>{currentStep.description}</p>
              ) : null}
              <p className="pf-muted" style={{ marginTop: '0.75rem' }}>{currentStep.xpReward} XP</p>
              <div style={{ marginTop: '1.25rem' }}>
                <Link to={PATHS.ROADMAP} className="pf-btn pf-btn-primary">Continue roadmap</Link>
              </div>
            </>
          ) : (
            <EmptyState
              title="No current step"
              message={
                progression?.learningPath
                  ? 'There is no published current step on this path.'
                  : 'Choose a learning path to begin at Step 1.'
              }
              action={
                <Link to={PATHS.ROADMAP} className="pf-btn pf-btn-primary">Open roadmaps</Link>
              }
            />
          )}
        </Card>

        <div className="page-stack">
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

          <Card className="dashboard-slot">
            <p className="pf-eyebrow">Achievements</p>
            <p className="pf-muted" style={{ marginTop: '0.75rem' }}>
              Badges unlock from completed steps, roadmap percent, catalogue skills, XP, and level.
            </p>
            <p style={{ marginTop: '1rem' }}>
              <Link to={PATHS.ACHIEVEMENTS} className="pf-btn pf-btn-secondary">View achievements</Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
