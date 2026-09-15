import { useCallback, useEffect, useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { getApiError, getFieldErrors } from '../../services/api.js'
import { createAdminOrganization, fetchAdminOrganizations } from '../../services/adminService.js'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  website: '',
  description: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
}

function AdminOrganizationsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [organizations, setOrganizations] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminOrganizations()
      setOrganizations(data.organizations || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load organizations'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    try {
      const result = await createAdminOrganization(form)
      setMessage(result.message)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to create organization'))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading organizations" message="Fetching organization accounts." />
  }

  if (status === 'error' && !organizations.length) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Organizations"
        description="Create an organization and its owner account. There is no organization approval workflow."
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <h2>Create organization</h2>
        <form className="profile-form" onSubmit={onSubmit}>
          <Input id="org-name" label="Organization name" value={form.name} onChange={onChange('name')} error={fieldErrors.name} required />
          <Input id="org-email" label="Organization email" type="email" value={form.email} onChange={onChange('email')} error={fieldErrors.email} required />
          <Input id="org-phone" label="Phone" value={form.phone} onChange={onChange('phone')} error={fieldErrors.phone} />
          <Input id="org-website" label="Website" type="url" value={form.website} onChange={onChange('website')} error={fieldErrors.website} />
          <Textarea id="org-description" label="Description" value={form.description} onChange={onChange('description')} error={fieldErrors.description} rows={3} />
          <Input id="owner-name" label="Owner name" value={form.ownerName} onChange={onChange('ownerName')} error={fieldErrors.ownerName} required />
          <Input id="owner-email" label="Owner email" type="email" value={form.ownerEmail} onChange={onChange('ownerEmail')} error={fieldErrors.ownerEmail} required />
          <Input
            id="owner-password"
            label="Owner password"
            type="password"
            value={form.ownerPassword}
            onChange={onChange('ownerPassword')}
            error={fieldErrors.ownerPassword}
            required
          />
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create organization'}
          </Button>
        </form>
      </Card>

      <Card>
        {!organizations.length ? (
          <EmptyState title="No organizations" message="Create an organization and owner account to get started." />
        ) : (
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Members</th>
                  <th>Opportunities</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td>{organization.name}</td>
                    <td>{organization.email}</td>
                    <td>{organization.memberCount}</td>
                    <td>{organization.opportunityCount}</td>
                    <td>{organization.status}</td>
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

export default AdminOrganizationsPage
