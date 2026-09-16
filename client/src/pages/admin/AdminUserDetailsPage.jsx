import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminUser } from '../../services/adminService.js'

function AdminUserDetailsPage() {
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminUser(id)
      setUser(data.user)
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load this user'))
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return <LoadingState title="Loading user" message="Fetching account details." />
  }

  if (status === 'error' || !user) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title={user.name}
        actions={<Link to={PATHS.ADMIN_USERS} className="pf-btn pf-btn-secondary">All users</Link>}
      />

      <Card>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Selected roadmap:</strong> {user.pathName}</p>
        <p><strong>XP:</strong> {user.xp}</p>
        <p><strong>Level:</strong> {user.level}</p>
        <p>
          <strong>Roadmap progress:</strong>{' '}
          {user.pathName !== 'None'
            ? `${user.completedSteps} / ${user.totalSteps} steps completed`
            : 'No roadmap selected'}
        </p>
        <p><strong>Joined:</strong> {user.joinedAt ? new Date(user.joinedAt).toLocaleString() : '—'}</p>
      </Card>

      <Card>
        <h2>Skills</h2>
        {user.skills?.length ? (
          <p>{user.skills.map((skill) => skill.name).join(', ')}</p>
        ) : (
          <p className="pf-muted">No skills added.</p>
        )}
      </Card>
    </div>
  )
}

export default AdminUserDetailsPage
