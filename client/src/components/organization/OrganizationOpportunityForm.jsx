import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Textarea from '../ui/Textarea.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError, getFieldErrors } from '../../services/api.js'
import {
  createOrganizationOpportunity,
  fetchOrganizationOpportunity,
  fetchOrganizationOpportunities,
  updateOrganizationOpportunity,
} from '../../services/organizationService.js'
import { toDateInput } from '../../utils/organization.js'

const EMPTY_FORM = {
  title: '',
  type: '',
  description: '',
  location: '',
  deadline: '',
  applicationUrl: '',
  eligibility: '',
  noSpecificSkill: false,
  skillIds: [],
}

function OrganizationOpportunityForm({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [status, setStatus] = useState(isEdit ? 'loading' : 'loading')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formMeta, setFormMeta] = useState({ types: [], skills: [], deadlineMin: '', deadlineMax: '' })
  const [form, setForm] = useState(EMPTY_FORM)
  const [approvalStatus, setApprovalStatus] = useState('draft')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError('')
      try {
        if (isEdit) {
          const data = await fetchOrganizationOpportunity(id)
          if (cancelled) {
            return
          }
          const opportunity = data.opportunity
          setFormMeta(data.form || { types: [], skills: [], deadlineMin: '', deadlineMax: '' })
          setForm({
            title: opportunity.title || '',
            type: opportunity.type || '',
            description: opportunity.description || '',
            location: opportunity.location || '',
            deadline: toDateInput(opportunity.deadline),
            applicationUrl: opportunity.applicationUrl || '',
            eligibility: opportunity.eligibility || '',
            noSpecificSkill: !(opportunity.skillIds && opportunity.skillIds.length),
            skillIds: opportunity.skillIds || [],
          })
          setApprovalStatus(opportunity.approvalStatus || 'draft')
        } else {
          const data = await fetchOrganizationOpportunities()
          if (cancelled) {
            return
          }
          setFormMeta(data.form || { types: [], skills: [], deadlineMin: '', deadlineMax: '' })
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

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    if (name === 'noSpecificSkill') {
      setForm((current) => ({ ...current, noSpecificSkill: checked, skillIds: checked ? [] : current.skillIds }))
      return
    }
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleSkill = (skillId) => {
    setForm((current) => {
      const selected = current.skillIds.includes(skillId)
        ? current.skillIds.filter((item) => item !== skillId)
        : [...current.skillIds, skillId]
      return { ...current, noSpecificSkill: false, skillIds: selected }
    })
  }

  const submit = async (intent) => {
    setSaving(true)
    setError('')
    setFieldErrors({})
    const payload = {
      title: form.title,
      type: form.type,
      description: form.description,
      location: form.location,
      deadline: form.deadline || null,
      applicationUrl: form.applicationUrl,
      eligibility: form.eligibility,
      noSpecificSkill: form.noSpecificSkill,
      skillIds: form.noSpecificSkill ? [] : form.skillIds,
      intent,
    }

    try {
      if (isEdit) {
        await updateOrganizationOpportunity(id, payload)
      } else {
        await createOrganizationOpportunity(payload)
      }
      navigate(PATHS.ORGANIZATION_OPPORTUNITIES)
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getApiError(err, 'Unable to save opportunity'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <p className="pf-muted">Loading form…</p>
  }

  if (status === 'error') {
    return <p className="pf-form-alert">{error}</p>
  }

  return (
    <Card>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit('draft')
        }}
      >
        {error ? <div className="pf-form-alert">{error}</div> : null}
        <Input
          id="title"
          name="title"
          label="Title"
          value={form.title}
          onChange={onChange}
          error={fieldErrors.title}
          required
        />
        <Select
          id="type"
          name="type"
          label="Type"
          value={form.type}
          onChange={onChange}
          error={fieldErrors.type}
          required
        >
          <option value="">Select type</option>
          {(formMeta.types || []).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Textarea
          id="description"
          name="description"
          label="Description"
          value={form.description}
          onChange={onChange}
          error={fieldErrors.description}
          required
        />
        <Input
          id="location"
          name="location"
          label="Location"
          value={form.location}
          onChange={onChange}
          error={fieldErrors.location}
        />
        <Input
          id="deadline"
          name="deadline"
          type="date"
          label="Deadline"
          min={formMeta.deadlineMin}
          max={formMeta.deadlineMax}
          value={form.deadline}
          onChange={onChange}
          error={fieldErrors.deadline}
        />
        <p className="pf-muted">Must be today through one year from today. Himalayas imports are not subject to this rule.</p>
        <Input
          id="applicationUrl"
          name="applicationUrl"
          type="url"
          label="Application URL"
          placeholder="https://"
          value={form.applicationUrl}
          onChange={onChange}
          error={fieldErrors.applicationUrl}
        />
        <Textarea
          id="eligibility"
          name="eligibility"
          label="Eligibility"
          value={form.eligibility}
          onChange={onChange}
          error={fieldErrors.eligibility}
        />
        <fieldset className="org-skills">
          <legend>Required skills</legend>
          <p className="pf-muted">Optional. Leave this open for listings that do not need a specific skill.</p>
          <label className="org-skill-option">
            <input
              type="checkbox"
              name="noSpecificSkill"
              checked={form.noSpecificSkill}
              onChange={onChange}
            />
            Open to all / No specific skill required
          </label>
          <div className="org-skill-list">
            {(formMeta.skills || []).map((skill) => (
              <label key={skill.id} className="org-skill-option">
                <input
                  type="checkbox"
                  disabled={form.noSpecificSkill}
                  checked={form.skillIds.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
                {skill.name}
              </label>
            ))}
          </div>
          {fieldErrors.skillIds ? <span className="pf-field-error">{fieldErrors.skillIds}</span> : null}
        </fieldset>
        <div className="org-actions">
          <Link to={PATHS.ORGANIZATION_OPPORTUNITIES} className="pf-btn pf-btn-secondary">
            Back
          </Link>
          <Button type="submit" variant="secondary" disabled={saving}>
            Save Draft
          </Button>
          <Button type="button" disabled={saving} onClick={() => submit('submit')}>
            {isEdit && approvalStatus === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default OrganizationOpportunityForm
