import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'
import { createAdminRoadmap, generateAdminRoadmap } from '../../services/adminService.js'

function AdminRoadmapCreatePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState('')
  const [beginner, setBeginner] = useState(true)
  const [form, setForm] = useState({
    pathName: '',
    description: '',
    icon: '',
  })

  const onChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const createPath = async () => {
    const payload = {
      pathName: form.pathName,
      description: form.description,
      icon: form.icon,
    }
    const created = await createAdminRoadmap(payload)
    return created.learningPath
  }

  const onCurate = async (event) => {
    event.preventDefault()
    setSaving('manual')
    setError('')
    setFieldErrors({})
    try {
      const path = await createPath()
      navigate(PATHS.adminRoadmap(path.id))
    } catch (err) {
      setError(getApiError(err, 'Unable to create this path'))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSaving('')
    }
  }

  const onGenerate = async (event) => {
    event.preventDefault()
    setSaving('ai')
    setError('')
    setFieldErrors({})
    let createdPath = null
    try {
      createdPath = await createPath()
      await generateAdminRoadmap(createdPath.id, { beginner })
      navigate(PATHS.adminRoadmapPreview(createdPath.id))
    } catch (err) {
      setError(getApiError(err, 'Unable to create this path or generate a draft'))
      setFieldErrors(getFieldErrors(err))
      if (createdPath?.id) {
        navigate(PATHS.adminRoadmap(createdPath.id))
      }
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title="Create New Path"
        description="Create a draft career path, then curate steps yourself or generate an unpublished AI draft. Students cannot see it until you publish."
        actions={<Link to={PATHS.ADMIN_ROADMAPS} className="pf-btn pf-btn-secondary">All paths</Link>}
      />

      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <form className="profile-form" onSubmit={onCurate}>
          <Input
            id="path-name"
            label="Path name"
            value={form.pathName}
            onChange={onChange('pathName')}
            error={fieldErrors.pathName}
            required
          />
          <Textarea
            id="path-description"
            label="Description"
            rows="4"
            value={form.description}
            onChange={onChange('description')}
            error={fieldErrors.description}
          />
          <Input
            id="path-icon"
            label="Icon (optional)"
            value={form.icon}
            onChange={onChange('icon')}
            error={fieldErrors.icon}
            placeholder="e.g. ⌬"
          />
          <label className="org-skill-option">
            <input
              type="checkbox"
              checked={beginner}
              onChange={(event) => setBeginner(event.target.checked)}
            />
            If generating with AI, request a complete beginner / foundation roadmap
          </label>
          <div className="org-actions">
            <Button type="submit" disabled={Boolean(saving)}>
              {saving === 'manual' ? 'Creating…' : 'Curate Manually'}
            </Button>
            <Button type="button" variant="secondary" disabled={Boolean(saving)} onClick={onGenerate}>
              {saving === 'ai' ? 'Generating draft…' : 'Generate Draft with AI'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default AdminRoadmapCreatePage
