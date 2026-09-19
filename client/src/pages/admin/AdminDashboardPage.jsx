import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminDashboard } from '../../services/adminService.js'

function Stat({ label, value }) {
  return (
    <Card className="dashboard-stat">
      <p className="pf-eyebrow">{label}</p>
      <strong>{value}</strong>
    </Card>
  )
}

function AdminDashboardPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      setData(await fetchAdminDashboard())
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load the admin dashboard'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return <LoadingState title="Loading admin" message="Fetching moderation overview." />
  }

  if (status === 'error' || !data) {
    return <ErrorState message={error} onRetry={load} />
  }

  const stats = data.stats || {}

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title="Moderation"
        description="Review pending opportunities, manage organizations, roadmaps, users, and demonstration subscriptions."
      />

      <div className="org-stat-row">
        <Stat label="Pending opportunities" value={stats.pendingOpportunities || 0} />
        <Stat label="Approved" value={stats.approved || 0} />
        <Stat label="Organizations" value={stats.organizations || 0} />
        <Stat label="Career path requests" value={stats.pendingCareerPathRequests || 0} />
      </div>

      <Card>
        <div className="org-actions">
          <Link to={PATHS.ADMIN_OPPORTUNITIES} className="pf-btn pf-btn-primary">
            Opportunity queue
          </Link>
          <Link to={PATHS.ADMIN_OPPORTUNITY_NEW} className="pf-btn pf-btn-secondary">
            Create opportunity
          </Link>
          <Link to={PATHS.ADMIN_ORGANIZATIONS} className="pf-btn pf-btn-secondary">
            Organizations
          </Link>
          <Link to={PATHS.ADMIN_CAREER_PATH_REQUESTS} className="pf-btn pf-btn-secondary">
            Career path requests
          </Link>
          <Link to={PATHS.ADMIN_ROADMAPS} className="pf-btn pf-btn-secondary">
            Roadmaps
          </Link>
          <Link to={PATHS.ADMIN_ROADMAP_NEW} className="pf-btn pf-btn-secondary">
            Create New Path
          </Link>
          <Link to={PATHS.ADMIN_USERS} className="pf-btn pf-btn-secondary">
            Users
          </Link>
          <Link to={PATHS.ADMIN_SUBSCRIPTIONS} className="pf-btn pf-btn-secondary">
            Subscriptions
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default AdminDashboardPage
