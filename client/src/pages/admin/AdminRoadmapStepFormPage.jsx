import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'
import {
  createAdminRoadmapStep,
  fetchAdminRoadmap,
  updateAdminRoadmapStep,
} from '../../services/adminService.js'
import { fetchSkills } from '../../services/skillService.js'
import { skillId } from '../../utils/skillName.js'

function AdminRoadmapStepFormPage({ mode }) {
  const { id, stepId } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pathName, setPathName] = useState('')
  const [catalogue, setCatalogue] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    stepNo: 1,
    title: '',
    description: '',
    xpReward: 10,
    skillIds: [],
  })

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      setError('')
      try {
        const [data, skillsData] = await Promise.all([
          fetchAdminRoadmap(id),
          fetchSkills().catch(() => ({ skills: [] })),
        ])
        setPathName(data.learningPath?.pathName || '')
        setCatalogue(skillsData.skills || [])
        if (isEdit) {
          const step = (data.steps || []).concat(data.draftSteps || []).find((item) => item.id === stepId)
          if (!step) {
            throw new Error('Roadmap step not found')
          }
          setForm({
            stepNo: step.stepNo,
            title: step.title,
            description: step.description || '',
            xpReward: step.xpReward,
            skillIds: (step.skills || []).map((skill) => skill.id || skill._id),
          })
        } else {
          const all = (data.steps || []).concat(data.draftSteps || [])
          const maxNo = all.reduce((max, step) => Math.max(max, Number(step.stepNo) || 0), 0)
          setForm({
            stepNo: maxNo + 1,
            title: '',
            description: '',
            xpReward: 10,
            skillIds: [],
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

  const toggleSkill = (skillKey) => {
    setForm((current) => ({
      ...current,
      skillIds: current.skillIds.includes(skillKey)
        ? current.skillIds.filter((item) => item !== skillKey)
        : [...current.skillIds, skillKey],
    }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    const payload = {
      stepNo: Number(form.stepNo),
      title: form.title,
      description: form.description,
      xpReward: Number(form.xpReward),
      skillIds: form.skillIds,
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
          <Textarea
            id="step-description"
            label="Description"
            rows="3"
            value={form.description}
            onChange={onChange('description')}
            error={fieldErrors.description}
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
          <div>
            <p className="pf-eyebrow">Skills</p>
            <p className="pf-muted">Assign catalogue skills used for student matching. Leave empty if this step has no skill requirement.</p>
            <div className="pf-chip-grid" style={{ marginTop: '0.75rem' }}>
              {catalogue.map((skill) => {
                const key = skillId(skill)
                return (
                  <button
                    key={key}
                    type="button"
                    className={`pf-chip ${form.skillIds.includes(key) ? 'is-selected' : ''}`}
                    onClick={() => toggleSkill(key)}
                  >
                    {skill.name}
                  </button>
                )
              })}
            </div>
            {fieldErrors.skillIds ? <p className="pf-field-error">{fieldErrors.skillIds}</p> : null}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add step'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default AdminRoadmapStepFormPage
