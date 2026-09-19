import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminRoadmapPreview, publishAdminRoadmap } from '../../services/adminService.js'

function AdminRoadmapPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)
  const [publishing, setPublishing] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminRoadmapPreview(id)
      setPayload(data)
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load this draft'))
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const onPublish = async () => {
    setPublishing(true)
    setError('')
    try {
      await publishAdminRoadmap(id)
      navigate(PATHS.adminRoadmap(id))
    } catch (err) {
      setError(getApiError(err, 'Unable to publish this draft'))
    } finally {
      setPublishing(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading draft" message="Fetching unpublished AI steps." />
  }

  if (status === 'error' && !payload) {
    return (
      <ErrorState message={error} onRetry={load} />
    )
  }

  const path = payload.learningPath
  const draftSteps = payload.draftSteps || []

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Review AI draft"
        description={`${path.pathName} — unpublished. Users cannot see these steps.`}
        actions={<Link to={PATHS.adminRoadmap(id)} className="pf-btn pf-btn-secondary">Back</Link>}
      />

      {error ? <div className="pf-form-alert">{error}</div> : null}

      {path.roadmapDraftTitle ? <h2>{path.roadmapDraftTitle}</h2> : null}
      {path.roadmapDraftDescription ? <p>{path.roadmapDraftDescription}</p> : null}

      <Card>
        {payload.hasStudentProgress ? (
          <p>Publishing is blocked because users already have progress on the live roadmap. Existing progress was not changed.</p>
        ) : (
          <>
            <p>Publishing replaces the live published steps with this draft. Curated or previous AI steps with no user progress will be replaced.</p>
            <Button onClick={onPublish} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </>
        )}
      </Card>

      <Card>
        {!draftSteps.length ? (
          <EmptyState title="No draft" message="There is no AI draft to preview. Generate a roadmap first." />
        ) : (
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>XP</th>
                  <th>Skills</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {draftSteps.map((step) => (
                  <tr key={step.id}>
                    <td>{step.stepNo}</td>
                    <td>{step.title}</td>
                    <td>{step.description}</td>
                    <td>{step.xpReward}</td>
                    <td>{step.skills?.map((skill) => skill.name).join(', ')}</td>
                    <td>
                      <Link to={PATHS.adminRoadmapStepEdit(id, step.id)}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default AdminRoadmapPreviewPage
