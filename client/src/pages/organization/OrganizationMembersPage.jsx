import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Select from '../../components/ui/Select.jsx'
import { getApiError, getFieldErrors } from '../../services/api.js'
import {
  addOrganizationMember,
  fetchOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMember,
} from '../../services/organizationService.js'

function OrganizationMembersPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [members, setMembers] = useState([])
  const [permissions, setPermissions] = useState({ canManageMembers: false })
  const [form, setForm] = useState({ email: '', role: 'member' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchOrganizationMembers()
      setMembers(data.members || [])
      setPermissions(data.permissions || { canManageMembers: false })
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load members'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onAdd = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    try {
      const data = await addOrganizationMember(form)
      setMembers(data.members || [])
      setMessage(data.message || 'Member added.')
      setForm({ email: '', role: 'member' })
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getApiError(err, 'Unable to add member'))
    } finally {
      setSaving(false)
    }
  }

  const onRoleChange = async (userId, role) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await updateOrganizationMember(userId, { role })
      setMembers(data.members || [])
      setMessage(data.message || 'Member role updated.')
    } catch (err) {
      setError(getApiError(err, 'Unable to update member'))
    } finally {
      setSaving(false)
    }
  }

  const onRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) {
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await removeOrganizationMember(userId)
      setMembers(data.members || [])
      setMessage(data.message || 'Member removed.')
    } catch (err) {
      setError(getApiError(err, 'Unable to remove member'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading members" message="Fetching organization members." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="org-page">
      <PageHeader
        eyebrow="Organization"
        title="Members"
        description="People who can access this organization panel."
      />

      {permissions.canManageMembers ? (
        <Card className="org-member-form">
          <h2>Add member</h2>
          <form className="org-inline-form" onSubmit={onAdd}>
            {error ? <div className="pf-form-alert">{error}</div> : null}
            <Input
              id="email"
              name="email"
              type="email"
              label="User email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              error={fieldErrors.email}
              required
            />
            <Select
              id="role"
              name="role"
              label="Role"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="member">member</option>
              <option value="owner">owner</option>
            </Select>
            <Button type="submit" disabled={saving}>
              Add member
            </Button>
          </form>
        </Card>
      ) : null}

      <Card>
        {message ? <div className="pf-flash">{message}</div> : null}
        {!permissions.canManageMembers && error ? <div className="pf-form-alert">{error}</div> : null}
        <div className="org-table-wrap">
          <table className="org-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                {permissions.canManageMembers ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId}>
                  <td>
                    <strong>{member.name}</strong>
                    <p className="pf-muted">{member.email}</p>
                  </td>
                  <td>
                    {permissions.canManageMembers ? (
                      <select
                        className="pf-select"
                        value={member.role}
                        disabled={saving}
                        onChange={(event) => onRoleChange(member.userId, event.target.value)}
                      >
                        <option value="owner">owner</option>
                        <option value="member">member</option>
                      </select>
                    ) : (
                      member.role
                    )}
                  </td>
                  {permissions.canManageMembers ? (
                    <td>
                      <Button variant="danger" disabled={saving} onClick={() => onRemove(member.userId)}>
                        Remove
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default OrganizationMembersPage
