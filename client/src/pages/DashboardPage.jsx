import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Briefcase,
  Compass,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import OpportunityMatch from '../components/opportunities/OpportunityMatch.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PATHS } from '../routes/paths.js'
import { getApiError } from '../services/api.js'
import { fetchAchievements } from '../services/achievementService.js'
import { fetchOpportunities } from '../services/opportunityService.js'
import { fetchProfile } from '../services/userService.js'
import { opportunityId } from '../utils/opportunity.js'

const RECOMMENDED_LIMIT = 4

function DashboardPage() {
  const { user, setUser } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])
  const [progression, setProgression] = useState(null)
  const [recommended, setRecommended] = useState([])
  const [opportunityMeta, setOpportunityMeta] = useState({ totalCount: 0, hasUserSkills: false })
  const [unlocked, setUnlocked] = useState([])

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const [profileData, opportunityData, achievementData] = await Promise.all([
        fetchProfile(),
        fetchOpportunities({ sort: 'match' }).catch(() => null),
        fetchAchievements().catch(() => null),
      ])
      setProfile(profileData.user)
      setSkills(profileData.skills || [])
      setProgression(profileData.progression || null)
      if (profileData.user) {
        setUser(profileData.user)
      }
      if (opportunityData) {
        setRecommended((opportunityData.opportunities || []).slice(0, RECOMMENDED_LIMIT))
        setOpportunityMeta({
          totalCount: opportunityData.totalCount || 0,
          hasUserSkills: Boolean(opportunityData.hasUserSkills),
        })
      }
      setUnlocked(achievementData?.unlocked || [])
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
    <div className="dashboard">
      <PageHeader
        eyebrow="Dashboard"
        title={`Hello, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Your career state, current quest, and recommended opportunities from the live Opportunity Hub."
      />

      <section className="dashboard-welcome">
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
          <p className="pf-eyebrow">XP + Level</p>
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
          <p className="pf-eyebrow">Roadmap progress</p>
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
      </section>

      <Card className="dashboard-quest">
        <div className="dashboard-section-head">
          <Swords size={18} aria-hidden="true" />
          <p className="pf-eyebrow">Current quest</p>
        </div>
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

      <section className="dashboard-recommend">
        <div className="dashboard-section-head dashboard-section-head--row">
          <div>
            <div className="dashboard-section-head">
              <Briefcase size={18} aria-hidden="true" />
              <p className="pf-eyebrow">Recommended opportunities</p>
            </div>
            <h2>Matched from the Opportunity Hub</h2>
          </div>
          <Link to={PATHS.OPPORTUNITIES} className="pf-btn pf-btn-secondary">View all</Link>
        </div>

        {!opportunityMeta.hasUserSkills ? (
          <p className="opportunity-hint pf-muted">
            Add skills on your profile to improve matching.{' '}
            <Link to={PATHS.SKILLS}>Manage skills</Link>
          </p>
        ) : null}

        {opportunityMeta.totalCount === 0 ? (
          <EmptyState
            title="No opportunities yet"
            message="Approved opportunities will appear here when they are published. Your roadmap and skills remain available."
          />
        ) : recommended.length === 0 ? (
          <EmptyState
            title="No recommendations to show"
            message="The Opportunity Hub has listings, but none are visible with the current filters."
            action={<Link to={PATHS.OPPORTUNITIES} className="pf-btn pf-btn-primary">Open Opportunity Hub</Link>}
          />
        ) : (
          <div className="dashboard-recommend__grid">
            {recommended.map((opportunity) => (
              <Card key={opportunityId(opportunity)} className="dashboard-recommend__card">
                <p className="pf-muted">{opportunity.type} · {opportunity.organization}</p>
                <h3>
                  <Link to={PATHS.opportunityDetail(opportunityId(opportunity))}>{opportunity.title}</Link>
                </h3>
                <OpportunityMatch opportunity={opportunity} compact />
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-lower">
        <Card>
          <div className="dashboard-section-head">
            <Sparkles size={18} aria-hidden="true" />
            <p className="pf-eyebrow">Skills</p>
          </div>
          {skills.length ? (
            <div className="skills-list" style={{ marginTop: '1rem' }}>
              {skills.map((skill) => (
                <span key={skill._id} className="skill-pill">{skill.name}</span>
              ))}
            </div>
          ) : (
            <p className="pf-muted" style={{ marginTop: '0.75rem' }}>
              You have not added skills yet. Catalogue and custom skills both improve opportunity matching.
            </p>
          )}
          <p style={{ marginTop: '1rem' }}>
            <Link to={PATHS.PROFILE} className="pf-btn pf-btn-secondary">Manage skills</Link>
          </p>
        </Card>

        <Card>
          <div className="dashboard-section-head">
            <Trophy size={18} aria-hidden="true" />
            <p className="pf-eyebrow">Achievements</p>
          </div>
          {unlocked.length ? (
            <ul className="dashboard-achievements">
              {unlocked.slice(0, 3).map((item) => (
                <li key={item.id || item.slug}>
                  <Award size={16} aria-hidden="true" />
                  {item.title || item.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pf-muted" style={{ marginTop: '0.75rem' }}>
              Badges unlock from completed steps, roadmap percent, skills, XP, and level.
            </p>
          )}
          <p style={{ marginTop: '1rem' }}>
            <Link to={PATHS.ACHIEVEMENTS} className="pf-btn pf-btn-secondary">View achievements</Link>
          </p>
        </Card>

        <Card>
          <div className="dashboard-section-head">
            <Compass size={18} aria-hidden="true" />
            <p className="pf-eyebrow">Recent activity</p>
          </div>
          <ul className="dashboard-activity">
            <li>
              {progression?.completedSteps
                ? `${progression.completedSteps} published roadmap ${progression.completedSteps === 1 ? 'step' : 'steps'} completed`
                : 'No roadmap steps completed yet'}
            </li>
            <li>
              {skills.length
                ? `${skills.length} ${skills.length === 1 ? 'skill' : 'skills'} on your profile`
                : 'No skills recorded yet'}
            </li>
            <li>
              {unlocked.length
                ? `${unlocked.length} ${unlocked.length === 1 ? 'achievement' : 'achievements'} unlocked`
                : 'No achievements unlocked yet'}
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
