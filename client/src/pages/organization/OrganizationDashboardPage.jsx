import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OrganizationOpportunityTable from '../../components/organization/OrganizationOpportunityTable.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import {
  deleteOrganizationOpportunity,
  fetchOrganizationDashboard,
  submitOrganizationOpportunity,
} from '../../services/organizationService.js'

function OrganizationDashboardPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const payload = await fetchOrganizationDashboard()
      setData(payload)
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load the organization dashboard'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onSubmit = async (opportunity) => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await submitOrganizationOpportunity(opportunity.id)
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to submit opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (opportunity) => {
    if (!window.confirm('Delete this draft opportunity?')) {
      return
    }
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await deleteOrganizationOpportunity(opportunity.id)
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to delete opportunity'))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading organization" message="Fetching your organization overview." />
  }

  if (status === 'error' && !data) {
    return <ErrorState message={error} onRetry={load} />
  }

  const stats = data.stats || {}
  const isOwner = Boolean(data.permissions?.isOwner)

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title={data.organization?.name || 'Organization'}
        description="Track drafts, review status, and opportunities your organization has submitted."
        actions={
          isOwner ? (
            <Link to={PATHS.ORGANIZATION_OPPORTUNITY_NEW} className="pf-btn">
              Create Opportunity
            </Link>
          ) : null
        }
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <div className="org-stat-row">
        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Total</p>
          <strong>{stats.total || 0}</strong>
        </Card>
        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Draft</p>
          <strong>{stats.draft || 0}</strong>
        </Card>
        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Pending review</p>
          <strong>{stats.pending || 0}</strong>
        </Card>
        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Approved</p>
          <strong>{stats.approved || 0}</strong>
        </Card>
        <Card className="dashboard-stat">
          <p className="pf-eyebrow">Rejected</p>
          <strong>{stats.rejected || 0}</strong>
        </Card>
      </div>

      <Card>
        <h2>Recent opportunities</h2>
        <OrganizationOpportunityTable
          opportunities={data.recent || []}
          isOwner={isOwner}
          onSubmit={onSubmit}
          onDelete={onDelete}
          submitting={busy}
        />
      </Card>
    </div>
  )
}

export default OrganizationDashboardPage
