import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Select from '../../components/ui/Select.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'
import {
  createAdminOpportunity,
  fetchAdminOpportunities,
  fetchAdminOpportunity,
  updateAdminOpportunity,
} from '../../services/adminService.js'
import { toDateInput } from '../../utils/organization.js'

const EMPTY_FORM = {
  title: '',
  organization: '',
  type: '',
  description: '',
  requiredSkills: '',
  eligibility: '',
  deadline: '',
  applicationUrl: '',
  location: '',
}

function AdminOpportunityFormPage({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [formMeta, setFormMeta] = useState({ types: [], deadlineMin: '', deadlineMax: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError('')
      try {
        if (isEdit) {
          const data = await fetchAdminOpportunity(id)
          if (cancelled) {
            return
          }
          const opportunity = data.opportunity
          setFormMeta(data.form || { types: [], deadlineMin: '', deadlineMax: '' })
          setForm({
            title: opportunity.title || '',
            organization: opportunity.organization || '',
            type: opportunity.type || '',
            description: opportunity.description || '',
            requiredSkills: opportunity.requiredSkills || '',
            eligibility: opportunity.eligibility || '',
            deadline: toDateInput(opportunity.deadline),
            applicationUrl: opportunity.applicationUrl || '',
            location: opportunity.location || '',
          })
        } else {
          const data = await fetchAdminOpportunities()
          if (cancelled) {
            return
          }
          setFormMeta(data.form || { types: [], deadlineMin: '', deadlineMax: '' })
          setForm(EMPTY_FORM)
        }
        setStatus('success')
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err, 'Unable to load the opportunity form'))
          setStatus('error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const onChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const payload = { ...form, deadline: form.deadline || null }
      const result = isEdit
        ? await updateAdminOpportunity(id, payload)
        : await createAdminOpportunity(payload)
      navigate(PATHS.adminOpportunity(result.opportunity.id))
    } catch (err) {
      setError(getApiError(err, 'Unable to save opportunity'))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading form" message="Preparing the opportunity form." />
  }

  if (status === 'error') {
    return <ErrorState message={error} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title={isEdit ? 'Edit opportunity' : 'Create opportunity'}
        description={
          isEdit
            ? 'Source, external ID, and organization ownership are preserved.'
            : 'Manual listings are approved immediately. Deadlines may be up to 2 years from today.'
        }
      />

      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <form className="profile-form" onSubmit={onSubmit}>
          <Input id="title" label="Title" value={form.title} onChange={onChange('title')} error={fieldErrors.title} required />
          <Input
            id="organization"
            label="Organization"
            value={form.organization}
            onChange={onChange('organization')}
            error={fieldErrors.organization}
            required
          />
          <Select id="type" label="Type" value={form.type} onChange={onChange('type')} error={fieldErrors.type} required>
            <option value="">Select type</option>
            {(formMeta.types || []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Textarea
            id="description"
            label="Description"
            value={form.description}
            onChange={onChange('description')}
            error={fieldErrors.description}
            rows={5}
          />
          <Input
            id="requiredSkills"
            label="Required skills"
            value={form.requiredSkills}
            onChange={onChange('requiredSkills')}
            error={fieldErrors.requiredSkills}
          />
          <Textarea
            id="eligibility"
            label="Eligibility"
            value={form.eligibility}
            onChange={onChange('eligibility')}
            error={fieldErrors.eligibility}
            rows={3}
          />
          <Input
            id="deadline"
            label="Deadline"
            type="date"
            value={form.deadline}
            min={formMeta.deadlineMin || undefined}
            max={formMeta.deadlineMax || undefined}
            onChange={onChange('deadline')}
            error={fieldErrors.deadline}
          />
          <Input
            id="applicationUrl"
            label="Application URL"
            type="url"
            value={form.applicationUrl}
            onChange={onChange('applicationUrl')}
            error={fieldErrors.applicationUrl}
            required
          />
          <Input
            id="location"
            label="Location"
            value={form.location}
            onChange={onChange('location')}
            error={fieldErrors.location}
          />
          <div className="org-actions">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create opportunity'}
            </Button>
            <Link to={isEdit ? PATHS.adminOpportunity(id) : PATHS.ADMIN_OPPORTUNITIES} className="pf-btn pf-btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default AdminOpportunityFormPage
