import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { getApiError, getFieldErrors } from '../../services/api.js'
import { fetchOrganizationProfile, updateOrganizationProfile } from '../../services/organizationService.js'

function OrganizationProfilePage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [permissions, setPermissions] = useState({ canUpdateProfile: false })
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    logoUrl: '',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchOrganizationProfile()
      setPermissions(data.permissions || { canUpdateProfile: false })
      setForm({
        name: data.organization.name || '',
        slug: data.organization.slug || '',
        email: data.organization.email || '',
        phone: data.organization.phone || '',
        website: data.organization.website || '',
        description: data.organization.description || '',
        logoUrl: data.organization.logoUrl || '',
        status: data.organization.status || 'active',
      })
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load organization profile'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (Object.keys(next).length) {
      setFieldErrors(next)
      setSaving(false)
      return
    }
    try {
      const data = await updateOrganizationProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        website: form.website,
        description: form.description,
        logoUrl: form.logoUrl,
      })
      setForm((current) => ({
        ...current,
        ...data.organization,
        phone: data.organization.phone || '',
        website: data.organization.website || '',
        description: data.organization.description || '',
        logoUrl: data.organization.logoUrl || '',
      }))
      setMessage(data.message || 'Organization profile updated.')
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getApiError(err, 'Unable to save organization profile'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading profile" message="Fetching organization details." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  const readOnly = !permissions.canUpdateProfile

  return (
    <div className="org-page">
      <PageHeader
        eyebrow="Organization"
        title="Organization profile"
        description="Name, contact details, and public listing information."
      />
      <Card>
        <form className="profile-form" onSubmit={onSubmit}>
          {message ? <div className="pf-flash">{message}</div> : null}
          {error ? <div className="pf-form-alert">{error}</div> : null}
          <Input id="name" name="name" label="Name" value={form.name} onChange={onChange} error={fieldErrors.name} readOnly={readOnly} />
          <Input id="slug" name="slug" label="Slug" value={form.slug} readOnly />
          <Input id="email" name="email" type="email" label="Email" value={form.email} onChange={onChange} error={fieldErrors.email} readOnly={readOnly} />
          <Input id="phone" name="phone" label="Phone" value={form.phone} onChange={onChange} error={fieldErrors.phone} readOnly={readOnly} />
          <Input id="website" name="website" type="url" label="Website" value={form.website} onChange={onChange} error={fieldErrors.website} readOnly={readOnly} />
          <Textarea id="description" name="description" label="Description" value={form.description} onChange={onChange} error={fieldErrors.description} readOnly={readOnly} />
          <Input id="logoUrl" name="logoUrl" type="url" label="Logo URL" value={form.logoUrl} onChange={onChange} error={fieldErrors.logoUrl} readOnly={readOnly} />
          <Input id="status" name="status" label="Status" value={form.status} readOnly />
          {readOnly ? (
            <p className="pf-muted">Only organization owners can update this profile.</p>
          ) : (
            <Button type="submit" disabled={saving}>
              Save profile
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}

export default OrganizationProfilePage
