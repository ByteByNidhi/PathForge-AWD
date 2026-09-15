import { useCallback, useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { getApiError } from '../../services/api.js'
import { fetchAdminCareerPathRequests, reviewAdminCareerPathRequests } from '../../services/adminService.js'
import { formatDate } from '../../utils/organization.js'

function AdminCareerPathRequestsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [groups, setGroups] = useState([])
  const [requests, setRequests] = useState([])
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminCareerPathRequests()
      setGroups(data.groups || [])
      setRequests(data.requests || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load career path requests'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onReview = async (requestedPath) => {
    setBusy(requestedPath)
    setError('')
    setMessage('')
    try {
      const result = await reviewAdminCareerPathRequests({ requestedPath })
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to mark requests as reviewed'))
    } finally {
      setBusy('')
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading requests" message="Fetching career path requests." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Career path requests"
        description="Students can request a path that is not in the catalogue. Mark a requested path as reviewed when you have seen it."
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        {!groups.length ? (
          <EmptyState title="No requests" message="No career path requests have been submitted yet." />
        ) : (
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Requested path</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.requestedPath}>
                    <td>{group.requestedPath}</td>
                    <td>{group.requestCount}</td>
                    <td>{group.pendingCount}</td>
                    <td>
                      {group.pendingCount > 0 ? (
                        <Button onClick={() => onReview(group.requestedPath)} disabled={Boolean(busy)}>
                          Mark reviewed
                        </Button>
                      ) : (
                        <span className="pf-muted">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {requests.length ? (
        <Card>
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Requested path</th>
                  <th>Status</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      {request.user?.name || 'Unknown'}
                      <p className="pf-muted org-reject-reason">{request.user?.email}</p>
                    </td>
                    <td>{request.requestedPath}</td>
                    <td>
                      <Badge tone={request.status === 'pending' ? 'warning' : 'success'}>{request.status}</Badge>
                    </td>
                    <td>{formatDate(request.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default AdminCareerPathRequestsPage
