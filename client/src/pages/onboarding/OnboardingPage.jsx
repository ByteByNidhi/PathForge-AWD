import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'
import { completeOnboarding, fetchOnboarding } from '../../services/onboardingService.js'
import { fetchRelevantSkills } from '../../services/skillService.js'

const STEPS = ['Career Path', 'Skills', 'Confirm']

function OnboardingPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [paths, setPaths] = useState([])
  const [selectedPathId, setSelectedPathId] = useState('')
  const [isOther, setIsOther] = useState(false)
  const [requestedPath, setRequestedPath] = useState('')
  const [isBeginner, setIsBeginner] = useState(null)
  const [skills, setSkills] = useState([])
  const [selectedSkillIds, setSelectedSkillIds] = useState([])
  const [skillsStatus, setSkillsStatus] = useState('idle')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchOnboarding()
      setPaths(data.learningPaths || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load onboarding'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSkills() {
      if (isOther || !selectedPathId) {
        setSkills([])
        return
      }
      setSkillsStatus('loading')
      try {
        const data = await fetchRelevantSkills(selectedPathId)
        if (!cancelled) {
          setSkills(data.skills || [])
          setSkillsStatus('success')
        }
      } catch (err) {
        if (!cancelled) {
          setSkills([])
          setSkillsStatus('error')
          setError(getApiError(err, 'Unable to load relevant skills'))
        }
      }
    }

    loadSkills()
    return () => {
      cancelled = true
    }
  }, [selectedPathId, isOther])

  const selectedPath = useMemo(
    () => paths.find((item) => item._id === selectedPathId),
    [paths, selectedPathId]
  )

  const toggleSkill = (id) => {
    setSelectedSkillIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const canContinueFromPath = isOther ? requestedPath.trim().length >= 2 : Boolean(selectedPathId)

  const goNext = () => {
    setFieldErrors({})
    if (step === 0 && !canContinueFromPath) {
      setFieldErrors({
        learningPathId: isOther
          ? 'Enter the career path you want reviewed'
          : 'Select a career path',
      })
      return
    }
    if (step === 1 && isBeginner === null) {
      setFieldErrors({ isBeginner: 'Choose a starting point' })
      return
    }
    setStep((current) => Math.min(2, current + 1))
  }

  const onSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const data = await completeOnboarding({
        isOther,
        learningPathId: isOther ? undefined : selectedPathId,
        requestedPath: isOther ? requestedPath.trim() : undefined,
        isBeginner: Boolean(isBeginner),
        skillIds: isBeginner ? [] : selectedSkillIds,
      })
      setUser(data.user)
      navigate(PATHS.DASHBOARD, { replace: true })
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getApiError(err, 'Unable to complete onboarding'))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Preparing onboarding" message="Loading published career paths." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="onboarding">
      <PageHeader
        eyebrow="Onboarding"
        title="Set your starting point"
        description="Choose a career path, tell us about your skills, then confirm. Beginners can continue with none."
      />

      <div className="onboarding__steps">
        {STEPS.map((label, index) => (
          <div key={label} className={`onboarding__step ${index === step ? 'is-active' : ''}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>
      <ProgressBar value={step + 1} max={3} />

      <Card className="onboarding__panel" style={{ marginTop: '1.5rem' }}>
        {error ? <div className="pf-form-alert" style={{ marginBottom: '1rem' }}>{error}</div> : null}

        {step === 0 ? (
          <div className="page-stack">
            <h2>Career path</h2>
            <p className="pf-muted">
              Select a published PathForge path, or request another path for review. Other does not
              generate a roadmap.
            </p>
            {paths.length === 0 ? (
              <p className="pf-muted">No published career paths are available yet. You can still choose Other.</p>
            ) : (
              paths.map((path) => (
                <button
                  key={path._id}
                  type="button"
                  className={`pf-choice ${!isOther && selectedPathId === path._id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setIsOther(false)
                    setSelectedPathId(path._id)
                    setSelectedSkillIds([])
                  }}
                >
                  <div>
                    <h3>{path.title}</h3>
                    <p className="pf-muted">{path.description}</p>
                  </div>
                </button>
              ))
            )}
            <button
              type="button"
              className={`pf-choice ${isOther ? 'is-selected' : ''}`}
              onClick={() => {
                setIsOther(true)
                setSelectedPathId('')
                setSelectedSkillIds([])
              }}
            >
              <div>
                <h3>Other</h3>
                <p className="pf-muted">Request a path that is not in the catalogue. It will be stored for review.</p>
              </div>
            </button>
            {isOther ? (
              <Input
                id="requestedPath"
                label="Requested career path"
                value={requestedPath}
                onChange={(event) => setRequestedPath(event.target.value)}
                error={fieldErrors.requestedPath || fieldErrors.learningPathId}
              />
            ) : (
              fieldErrors.learningPathId ? (
                <p className="pf-field-error">{fieldErrors.learningPathId}</p>
              ) : null
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="page-stack">
            <h2>Skills</h2>
            <p className="pf-muted">
              Choosing beginner does not award XP and does not complete roadmap steps.
            </p>
            <button
              type="button"
              className={`pf-choice ${isBeginner === false ? 'is-selected' : ''}`}
              onClick={() => setIsBeginner(false)}
            >
              <div>
                <h3>I already have some skills</h3>
                <p className="pf-muted">Select catalogue skills related to your path. You can change these later.</p>
              </div>
            </button>
            <button
              type="button"
              className={`pf-choice ${isBeginner === true ? 'is-selected' : ''}`}
              onClick={() => {
                setIsBeginner(true)
                setSelectedSkillIds([])
              }}
            >
              <div>
                <h3>I&apos;m a total beginner</h3>
                <p className="pf-muted">Continue with zero skills. Your roadmap will start from Step 1 later.</p>
              </div>
            </button>
            {fieldErrors.isBeginner ? <p className="pf-field-error">{fieldErrors.isBeginner}</p> : null}

            {isBeginner === false && !isOther ? (
              skillsStatus === 'loading' ? (
                <LoadingState title="Loading skills" message="Fetching skills for this career path." />
              ) : skills.length ? (
                <div className="pf-chip-grid">
                  {skills.map((skill) => (
                    <button
                      key={skill._id}
                      type="button"
                      className={`pf-chip ${selectedSkillIds.includes(skill._id) ? 'is-selected' : ''}`}
                      onClick={() => toggleSkill(skill._id)}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="pf-muted">No mapped skills for this path yet. You can add skills later.</p>
              )
            ) : null}

            {isBeginner === false && isOther ? (
              <p className="pf-muted">
                Other paths do not receive a generated skill list. You can manage catalogue skills after onboarding.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="page-stack">
            <h2>Confirm</h2>
            <p>
              <strong>Career path: </strong>
              {isOther ? `Other — ${requestedPath.trim()}` : selectedPath?.title}
            </p>
            {isOther ? (
              <p className="pf-muted">
                A career path request will be created with pending status. No dynamic roadmap will be generated.
              </p>
            ) : null}
            <p>
              <strong>Starting point: </strong>
              {isBeginner ? 'Total beginner' : 'Some existing skills'}
            </p>
            <p>
              <strong>Skills selected: </strong>
              {isBeginner ? 'None' : selectedSkillIds.length}
            </p>
          </div>
        ) : null}

        <div className="onboarding__actions">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
            Back
          </Button>
          {step < 2 ? (
            <Button onClick={goNext}>Continue</Button>
          ) : (
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Complete onboarding'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export default OnboardingPage
