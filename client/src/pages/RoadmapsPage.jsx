import { Check, Compass, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getApiError } from '../services/api.js'
import {
  completeLearningPathStep,
  fetchLearningPathRoadmap,
  fetchLearningPaths,
  selectLearningPath,
} from '../services/learningPathService.js'

function pathId(path) {
  return String(path?.id || path?._id || '')
}

function stepStateLabel(step) {
  if (step.state === 'completed') return 'Completed'
  if (step.state === 'current') return 'Current'
  return 'Locked'
}

function RoadmapsPage() {
  const { setUser } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [paths, setPaths] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [saving, setSaving] = useState(false)

  const selectedPath = useMemo(
    () => paths.find((path) => path.selected) || roadmap?.learningPath || null,
    [paths, roadmap]
  )

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const pathData = await fetchLearningPaths()
      const list = pathData.learningPaths || []
      setPaths(list)
      const current = list.find((path) => path.selected)
      if (current) {
        const roadmapData = await fetchLearningPathRoadmap(pathId(current))
        setRoadmap(roadmapData)
      } else {
        setRoadmap(null)
      }
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load roadmaps'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSelectPath = async (path) => {
    setSaving(true)
    setActionError('')
    try {
      const data = await selectLearningPath(pathId(path))
      if (data.user) {
        setUser(data.user)
      }
      const roadmapData = await fetchLearningPathRoadmap(pathId(path))
      setRoadmap(roadmapData)
      setPaths((current) =>
        current.map((item) => ({
          ...item,
          selected: pathId(item) === pathId(path),
        }))
      )
    } catch (err) {
      setActionError(getApiError(err, 'Unable to select this path'))
    } finally {
      setSaving(false)
    }
  }

  const onComplete = async (step) => {
    if (!roadmap?.learningPath || step.state !== 'current') {
      return
    }
    setSaving(true)
    setActionError('')
    try {
      const data = await completeLearningPathStep(pathId(roadmap.learningPath), step.id)
      if (data.user) {
        setUser(data.user)
      }
      setRoadmap(data)
    } catch (err) {
      setActionError(getApiError(err, 'Unable to complete this step'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading roadmaps" message="Fetching your selected career path." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  const steps = roadmap?.steps || []
  const currentStep = steps.find((step) => step.state === 'current')
  const roadmapCompleted =
    Boolean(roadmap) &&
    roadmap.totalPublishedSteps > 0 &&
    roadmap.completedSteps === roadmap.totalPublishedSteps

  return (
    <div>
      <PageHeader
        eyebrow="Roadmaps"
        title={selectedPath?.pathName || selectedPath?.title || 'Your roadmap'}
        description={
          selectedPath?.description
          || 'Select a career path to open its published roadmap steps.'
        }
      />

      {actionError ? <div className="pf-form-alert" style={{ marginBottom: '1rem' }}>{actionError}</div> : null}

      {paths.length ? (
        <div className="path-switcher" role="list">
          {paths.map((path) => (
            <button
              key={pathId(path)}
              type="button"
              className={`path-switcher__item ${path.selected ? 'is-selected' : ''}`.trim()}
              onClick={() => onSelectPath(path)}
              disabled={saving}
            >
              <span className="path-switcher__icon" aria-hidden="true">
                {path.icon || '◆'}
              </span>
              <span>
                <strong>{path.pathName || path.title}</strong>
                {path.selected ? <span className="pf-muted"> Current path</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!selectedPath ? (
        <EmptyState
          title="No career path selected"
          message="Choose a learning path above to see its published roadmap."
        />
      ) : (
        <div className="roadmap-layout">
          <Card className="roadmap-summary">
            <p className="pf-eyebrow">Progress</p>
            <h2>{roadmap?.progressPercent ?? 0}% complete</h2>
            <p className="pf-muted" style={{ marginTop: '0.5rem' }}>
              {roadmap?.completedSteps ?? 0} / {roadmap?.totalPublishedSteps ?? 0} published steps
            </p>
            <div style={{ marginTop: '1rem' }}>
              <ProgressBar value={roadmap?.progressPercent ?? 0} max={100} />
            </div>
            <p className="pf-muted" style={{ marginTop: '1rem' }}>
              Level {roadmap?.level ?? 1} · {roadmap?.totalXp ?? 0} XP
            </p>
            {roadmapCompleted ? (
              <p style={{ marginTop: '1rem' }}>
                <Badge tone="success">Roadmap completed</Badge>
              </p>
            ) : currentStep ? (
              <p className="pf-muted" style={{ marginTop: '1rem' }}>
                Current step: {currentStep.stepNo}. {currentStep.title}
              </p>
            ) : (
              <p className="pf-muted" style={{ marginTop: '1rem' }}>
                No published steps are available on this path.
              </p>
            )}
          </Card>

          {steps.length === 0 ? (
            <EmptyState
              title="No published steps"
              message="This path has no published roadmap steps yet."
            />
          ) : (
            <ol className="roadmap-list">
              {steps.map((step) => (
                <li key={step.id}>
                  <Card className={`roadmap-step is-${step.state}`}>
                    <div className="roadmap-step__marker" aria-hidden="true">
                      {step.state === 'completed' ? <Check size={16} /> : null}
                      {step.state === 'current' ? <Compass size={16} /> : null}
                      {step.state === 'locked' ? <Lock size={16} /> : null}
                    </div>
                    <div className="roadmap-step__body">
                      <div className="roadmap-step__top">
                        <p className="pf-eyebrow">Step {step.stepNo}</p>
                        <Badge
                          tone={
                            step.state === 'completed'
                              ? 'success'
                              : step.state === 'current'
                                ? 'info'
                                : 'neutral'
                          }
                        >
                          {stepStateLabel(step)}
                        </Badge>
                      </div>
                      <h3>{step.title}</h3>
                      {step.description ? <p className="pf-muted">{step.description}</p> : null}
                      <p className="roadmap-step__xp">{step.xpReward} XP</p>
                      {step.skills?.length ? (
                        <div className="skills-list">
                          {step.skills.map((skill) => (
                            <span key={skill.id || skill._id} className="skill-pill">{skill.name}</span>
                          ))}
                        </div>
                      ) : null}
                      {step.state === 'current' ? (
                        <Button
                          onClick={() => onComplete(step)}
                          disabled={saving}
                          style={{ marginTop: '1rem' }}
                        >
                          {saving ? 'Saving…' : 'Mark complete'}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

export default RoadmapsPage
