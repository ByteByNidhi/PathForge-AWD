import { Award, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { fetchAchievements } from '../services/achievementService.js'
import { getApiError } from '../services/api.js'

function formatUnlockedAt(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function AchievementCard({ item }) {
  const unlockedDate = formatUnlockedAt(item.unlockedAt)

  return (
    <Card className={`achievement-card ${item.unlocked ? 'is-unlocked' : 'is-locked'}`}>
      <div className="achievement-card__icon" aria-hidden="true">
        {item.unlocked ? <Award size={22} /> : <Lock size={20} />}
      </div>
      <div>
        <div className="achievement-card__top">
          <h2>{item.title || item.name}</h2>
          <Badge tone={item.unlocked ? 'success' : 'neutral'}>
            {item.unlocked ? 'Unlocked' : 'Locked'}
          </Badge>
        </div>
        <p className="pf-muted">{item.description}</p>
        {item.unlocked && unlockedDate ? (
          <p className="achievement-card__date">Unlocked {unlockedDate}</p>
        ) : null}
      </div>
    </Card>
  )
}

function AchievementsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState([])
  const [locked, setLocked] = useState([])

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAchievements()
      setUnlocked(data.unlocked || [])
      setLocked(data.locked || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load achievements'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (status === 'loading') {
    return <LoadingState title="Loading achievements" message="Fetching your badge catalog." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Achievements"
        title="Badges earned on the trail"
        description="These badges unlock from real progress: completed steps, roadmap percent, catalogue skills, XP, and level."
      />

      <section className="page-stack">
        <div>
          <p className="pf-eyebrow">Unlocked</p>
          {unlocked.length ? (
            <div className="achievement-grid" style={{ marginTop: '1rem' }}>
              {unlocked.map((item) => (
                <AchievementCard key={item.id || item.slug} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No badges unlocked yet"
              message="Complete your current roadmap step or add catalogue skills to start earning achievements."
            />
          )}
        </div>

        <div>
          <p className="pf-eyebrow">Locked</p>
          {locked.length ? (
            <div className="achievement-grid" style={{ marginTop: '1rem' }}>
              {locked.map((item) => (
                <AchievementCard key={item.id || item.slug} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Catalog complete"
              message="Every PathForge achievement is unlocked."
            />
          )}
        </div>
      </section>
    </div>
  )
}

export default AchievementsPage
