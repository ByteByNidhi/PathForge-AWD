import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'
import {
  createAdminRoadmapStep,
  fetchAdminRoadmap,
  updateAdminRoadmapStep,
} from '../../services/adminService.js'

function AdminRoadmapStepFormPage({ mode }) {
  const { id, stepId } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pathName, setPathName] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    stepNo: 1,
    title: '',
    xpReward: 10,
  })

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      setError('')
      try {
        const data = await fetchAdminRoadmap(id)
        setPathName(data.learningPath?.pathName || '')
        if (isEdit) {
          const step = (data.steps || []).concat(data.draftSteps || []).find((item) => item.id === stepId)
          if (!step) {
            throw new Error('Roadmap step not found')
          }
          setForm({
            stepNo: step.stepNo,
            title: step.title,
            xpReward: step.xpReward,
          })
        } else {
          const maxNo = (data.steps || []).reduce((max, step) => Math.max(max, Number(step.stepNo) || 0), 0)
          setForm({
            stepNo: maxNo + 1,
            title: '',
            xpReward: 10,
          })
        }
        setStatus('success')
      } catch (err) {
        setError(getApiError(err, 'Unable to load this step'))
        setStatus('error')
      }
    }

    load()
  }, [id, isEdit, stepId])

  const onChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    const payload = {
      stepNo: Number(form.stepNo),
      title: form.title,
      xpReward: Number(form.xpReward),
    }
    try {
      if (isEdit) {
        await updateAdminRoadmapStep(id, stepId, payload)
      } else {
        await createAdminRoadmapStep(id, payload)
      }
      navigate(PATHS.adminRoadmap(id))
    } catch (err) {
      setError(getApiError(err, 'Unable to save this step'))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading step" message="Preparing the roadmap step form." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title={isEdit ? 'Edit step' : 'Add step'}
        description={pathName}
        actions={<Link to={PATHS.adminRoadmap(id)} className="pf-btn pf-btn-secondary">Back</Link>}
      />

      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <form className="profile-form" onSubmit={onSubmit}>
          <Input
            id="step-no"
            label="Step number"
            type="number"
            min="1"
            value={form.stepNo}
            onChange={onChange('stepNo')}
            error={fieldErrors.stepNo}
            required
          />
          <Input
            id="step-title"
            label="Title"
            value={form.title}
            onChange={onChange('title')}
            error={fieldErrors.title}
            required
          />
          <Input
            id="step-xp"
            label="XP reward"
            type="number"
            min="0"
            value={form.xpReward}
            onChange={onChange('xpReward')}
            error={fieldErrors.xpReward}
            required
          />
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add step'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default AdminRoadmapStepFormPage
