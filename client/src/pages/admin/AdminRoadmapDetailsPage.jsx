import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import {
  deleteAdminRoadmapStep,
  fetchAdminRoadmap,
  generateAdminRoadmap,
  moveAdminRoadmapStep,
  publishAdminRoadmap,
} from '../../services/adminService.js'

function StepTable({ pathId, steps, deleting, moving, onDelete, onMove, emptyTitle, emptyMessage }) {
  if (!steps.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="org-table-wrap">
      <table className="org-table">
        <thead>
          <tr>
            <th>Step</th>
            <th>Title</th>
            <th>XP</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => (
            <tr key={step.id}>
              <td>{step.stepNo}</td>
              <td>
                {step.title}
                {step.skills?.length ? (
                  <div className="pf-muted">{step.skills.map((skill) => skill.name).join(', ')}</div>
                ) : null}
              </td>
              <td>{step.xpReward}</td>
              <td>
                <div className="org-actions">
                  <Button
                    variant="secondary"
                    disabled={moving === step.id || index === 0}
                    onClick={() => onMove(step, 'up')}
                  >
                    Up
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={moving === step.id || index === steps.length - 1}
                    onClick={() => onMove(step, 'down')}
                  >
                    Down
                  </Button>
                  <Link to={PATHS.adminRoadmapStepEdit(pathId, step.id)}>Edit</Link>
                  <Button
                    variant="danger"
                    disabled={deleting === step.id}
                    onClick={() => onDelete(step)}
                  >
                    {deleting === step.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminRoadmapDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [payload, setPayload] = useState(null)
  const [beginner, setBeginner] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState('')
  const [moving, setMoving] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminRoadmap(id)
      setPayload(data)
      setBeginner(Boolean(data.isBeginnerPath))
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load this roadmap'))
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const onGenerate = async (event) => {
    event.preventDefault()
    setGenerating(true)
    setError('')
    setMessage('')
    try {
      await generateAdminRoadmap(id, { beginner })
      navigate(PATHS.adminRoadmapPreview(id))
    } catch (err) {
      setError(getApiError(err, 'Unable to generate an AI draft'))
    } finally {
      setGenerating(false)
    }
  }

  const onPublish = async () => {
    setPublishing(true)
    setError('')
    setMessage('')
    try {
      const result = await publishAdminRoadmap(id)
      setPayload(result)
      setMessage(result.message || 'Path published. Students can now select it.')
    } catch (err) {
      setError(getApiError(err, 'Unable to publish this path'))
    } finally {
      setPublishing(false)
    }
  }

  const onDelete = async (step) => {
    if (!window.confirm('Delete this step? Related progress records for this step will also be removed.')) {
      return
    }
    setDeleting(step.id)
    setError('')
    setMessage('')
    try {
      const result = await deleteAdminRoadmapStep(id, step.id)
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to delete this step'))
    } finally {
      setDeleting('')
    }
  }

  const onMove = async (step, direction) => {
    setMoving(step.id)
    setError('')
    try {
      await moveAdminRoadmapStep(id, step.id, { direction })
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to reorder this step'))
    } finally {
      setMoving('')
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading path" message="Fetching published and draft steps." />
  }

  if (status === 'error' && !payload) {
    return <ErrorState message={error} onRetry={load} />
  }

  const path = payload.learningPath
  const steps = payload.steps || []
  const draftSteps = payload.draftSteps || []
  const unpublished = path.isPublished === false
  const canPublish = unpublished && (steps.length > 0 || draftSteps.length > 0)

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title={path.pathName}
        description={path.description || 'Manage steps, generate an unpublished AI draft, then publish when ready.'}
        actions={
          <div className="org-actions">
            <Link to={PATHS.ADMIN_ROADMAPS} className="pf-btn pf-btn-secondary">All paths</Link>
            <Link to={PATHS.adminRoadmapStepNew(id)} className="pf-btn pf-btn-secondary">Add roadmap step</Link>
            {canPublish ? (
              <Button onClick={onPublish} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish path'}
              </Button>
            ) : null}
          </div>
        }
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <p>
        <Badge tone={unpublished ? 'warning' : 'success'}>
          {unpublished ? 'Draft path — hidden from students' : 'Published path'}
        </Badge>
        {' '}
        <Badge>{path.isAiGenerated ? 'Live source: AI-generated' : 'Live source: Curated'}</Badge>
        {path.roadmapGeneratedAt ? (
          <span className="pf-muted"> Last generated {new Date(path.roadmapGeneratedAt).toLocaleString()}</span>
        ) : null}
      </p>

      <Card>
        <h2>Generate with AI</h2>
        <p className="pf-muted">Gemini drafts unpublished steps for review. Users never see a draft. Generation does not run for users. Publishing is never automatic.</p>
        {payload.hasStudentProgress ? (
          <p>Users already have progress on the live roadmap. You can still generate a draft, but publishing is blocked so their progress is not replaced.</p>
        ) : null}
        <form onSubmit={onGenerate}>
          <label className="org-skill-option" style={{ marginTop: '1rem' }}>
            <input
              type="checkbox"
              checked={beginner}
              onChange={(event) => setBeginner(event.target.checked)}
            />
            Generate a complete beginner / foundation roadmap
          </label>
          <div className="org-actions" style={{ marginTop: '1rem' }}>
            <Button type="submit" disabled={generating}>
              {generating
                ? 'Generating…'
                : draftSteps.length
                  ? 'Regenerate AI draft'
                  : 'Generate Draft with AI'}
            </Button>
            {draftSteps.length ? (
              <Link to={PATHS.adminRoadmapPreview(id)} className="pf-btn pf-btn-secondary">Review draft</Link>
            ) : null}
          </div>
        </form>
      </Card>

      {draftSteps.length ? (
        <Card>
          <h2>Draft steps</h2>
          <p className="pf-muted">Unpublished. Edit, reorder, or delete these before publishing. Students cannot see them.</p>
          <StepTable
            pathId={id}
            steps={draftSteps}
            deleting={deleting}
            moving={moving}
            onDelete={onDelete}
            onMove={onMove}
            emptyTitle="No draft steps"
            emptyMessage="No unpublished steps yet."
          />
        </Card>
      ) : null}

      <Card>
        <h2>Published steps</h2>
        <p className="pf-muted">This is what users currently see on a published path.</p>
        <StepTable
          pathId={id}
          steps={steps}
          deleting={deleting}
          moving={moving}
          onDelete={onDelete}
          onMove={onMove}
          emptyTitle="No published steps"
          emptyMessage="No published steps yet."
        />
      </Card>
    </div>
  )
}

export default AdminRoadmapDetailsPage
