import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminUsers } from '../../services/adminService.js'

function AdminUsersPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminUsers()
      setUsers(data.users || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load users'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return <LoadingState title="Loading users" message="Fetching PathForge accounts." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="View accounts, selected roadmaps, XP, and level. Users are not deleted from this panel."
      />

      <Card>
        {!users.length ? (
          <EmptyState title="No users" message="No users yet." />
        ) : (
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Roadmap</th>
                  <th>XP</th>
                  <th>Level</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.pathName}</td>
                    <td>{user.xp}</td>
                    <td>{user.level}</td>
                    <td>
                      <Link to={PATHS.adminUser(user.id)}>View</Link>
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

export default AdminUsersPage
