import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminSubscriptions } from '../../services/adminService.js'

function Stat({ label, value }) {
  return (
    <Card className="dashboard-stat">
      <p className="pf-eyebrow">{label}</p>
      <strong>{value}</strong>
    </Card>
  )
}

function AdminSubscriptionsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({})
  const [subscriptions, setSubscriptions] = useState([])

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminSubscriptions()
      setSummary(data.summary || {})
      setSubscriptions(data.subscriptions || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load subscriptions'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return <LoadingState title="Loading subscriptions" message="Fetching demonstration subscription records." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title="Subscriptions"
        description="Demonstration / mock subscription data only. No payment gateway is connected and no real charges are processed."
      />

      <div className="org-stat-row">
        <Stat label="Total Subscribers" value={summary.total || 0} />
        <Stat label="Active Subscriptions" value={summary.active || 0} />
        <Stat label="Expiring Soon" value={summary.expiring || 0} />
        <Stat label="Demo Revenue" value={`₹${Number(summary.revenue || 0).toLocaleString()}`} />
      </div>

      <Card>
        <h2>Dummy subscription records</h2>
        <div className="org-table-wrap">
          <table className="org-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Start date</th>
                <th>Valid until</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((row) => (
                <tr key={row.id}>
                  <td>{row.user}</td>
                  <td>{row.plan}</td>
                  <td>₹{Number(row.amount).toLocaleString()}</td>
                  <td>{row.startDate}</td>
                  <td>{row.renewsOn}</td>
                  <td>{row.status}</td>
                  <td>
                    <Link to={PATHS.adminSubscription(row.id)}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default AdminSubscriptionsPage
