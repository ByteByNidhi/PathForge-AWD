import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import Input from '../../components/ui/Input.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Select from '../../components/ui/Select.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import {
  approveAdminOpportunity,
  deleteAdminOpportunity,
  fetchAdminOpportunities,
  fetchHimalayasOpportunities,
  rejectAdminOpportunity,
} from '../../services/adminService.js'
import { approvalLabel, approvalTone, formatDate } from '../../utils/organization.js'

function OpportunityRow({ opportunity, busy, onApprove, onReject, onDelete }) {
  return (
    <tr>
      <td>
        <strong>{opportunity.title}</strong>
        {opportunity.rejectionReason ? (
          <p className="pf-muted org-reject-reason">{opportunity.rejectionReason}</p>
        ) : null}
      </td>
      <td>{opportunity.organization}</td>
      <td>{opportunity.type}</td>
      <td>{opportunity.sourceLabel || 'PathForge'}</td>
      <td>{formatDate(opportunity.deadline)}</td>
      <td>
        <Badge tone={approvalTone(opportunity.approvalStatus)}>
          {approvalLabel(opportunity.approvalStatus)}
        </Badge>
      </td>
      <td>
        <div className="org-actions">
          <Link to={PATHS.adminOpportunity(opportunity.id)} className="pf-btn pf-btn-secondary">
            View
          </Link>
          <Link to={PATHS.adminOpportunityEdit(opportunity.id)} className="pf-btn pf-btn-secondary">
            Edit
          </Link>
          {opportunity.canApprove ? (
            <Button onClick={() => onApprove(opportunity)} disabled={busy}>
              Approve
            </Button>
          ) : null}
          {opportunity.canReject ? (
            <Button variant="secondary" onClick={() => onReject(opportunity)} disabled={busy}>
              Reject
            </Button>
          ) : null}
          <Button variant="danger" onClick={() => onDelete(opportunity)} disabled={busy}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  )
}

function AdminOpportunitiesPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('pending')
  const [opportunities, setOpportunities] = useState([])
  const [pending, setPending] = useState([])
  const [learningPaths, setLearningPaths] = useState([])
  const [busy, setBusy] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [importQuery, setImportQuery] = useState('')
  const [importPathId, setImportPathId] = useState('')
  const [importCountry, setImportCountry] = useState('')
  const [importStats, setImportStats] = useState(null)

  const load = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent)
    if (!silent) {
      setStatus('loading')
    }
    setError('')
    try {
      const params = filter === 'all' ? {} : { status: filter }
      const data = await fetchAdminOpportunities(params)
      setOpportunities(data.opportunities || [])
      setPending(data.pending || [])
      setLearningPaths(data.learningPaths || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load opportunities'))
      setStatus('error')
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const onApprove = async (opportunity) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await approveAdminOpportunity(opportunity.id)
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to approve opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onReject = async (opportunity) => {
    const reason = window.prompt('Rejection reason (optional):', opportunity.rejectionReason || '')
    if (reason === null) {
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await rejectAdminOpportunity(opportunity.id, { rejectionReason: reason })
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to reject opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (opportunity) => {
    if (!window.confirm(`Delete “${opportunity.title}”? This cannot be undone.`)) {
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await deleteAdminOpportunity(opportunity.id)
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(getApiError(err, 'Unable to delete opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onFetchHimalayas = async (event) => {
    event.preventDefault()
    setFetching(true)
    setError('')
    setMessage('')
    setImportStats(null)
    try {
      const result = await fetchHimalayasOpportunities({
        query: importQuery,
        learningPathId: importPathId || undefined,
        country: importCountry || undefined,
      })
      setMessage(result.message)
      setImportStats({
        fetched: result.fetched,
        imported: result.imported,
        skippedDuplicates: result.skippedDuplicates ?? result.duplicates,
        skippedInvalid: result.skippedInvalid,
      })
      await load({ silent: true })
    } catch (err) {
      setError(getApiError(err, 'Unable to fetch Himalayas jobs'))
    } finally {
      setFetching(false)
    }
  }

  const queue = useMemo(
    () => (filter === 'pending' ? opportunities : pending),
    [filter, opportunities, pending]
  )

  if (status === 'loading') {
    return <LoadingState title="Loading opportunities" message="Fetching listings for moderation." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title="Opportunities"
        description="Approve pending listings, including Himalayas imports, before students can see them."
        actions={
          <Link to={PATHS.ADMIN_OPPORTUNITY_NEW} className="pf-btn pf-btn-primary">
            Create opportunity
          </Link>
        }
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <PageHeader
          eyebrow="Himalayas"
          title="Fetch from Himalayas"
          description="Imported jobs stay pending until you approve them."
        />
        <form className="himalayas-fetch" onSubmit={onFetchHimalayas}>
          <Input
            id="himalayas-query"
            label="Search query"
            value={importQuery}
            onChange={(event) => setImportQuery(event.target.value)}
            placeholder="Optional if a learning path is selected"
          />
          <Select
            id="himalayas-path"
            label="Learning path"
            value={importPathId}
            onChange={(event) => setImportPathId(event.target.value)}
          >
            <option value="">None</option>
            {learningPaths.map((path) => (
              <option key={path.id} value={path.id}>
                {path.pathName}
              </option>
            ))}
          </Select>
          <Input
            id="himalayas-country"
            label="Country"
            value={importCountry}
            onChange={(event) => setImportCountry(event.target.value)}
            placeholder="Optional"
          />
          <Button type="submit" disabled={fetching || busy}>
            {fetching ? 'Fetching…' : 'Fetch from Himalayas'}
          </Button>
        </form>
        {importStats ? (
          <p className="himalayas-fetch__meta">
            Imported {importStats.imported} · duplicates {importStats.skippedDuplicates} · skipped{' '}
            {importStats.skippedInvalid}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="admin-toolbar">
          <Select id="admin-status-filter" label="Status" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
            <option value="all">All</option>
          </Select>
        </div>
      </Card>

      {filter !== 'pending' && queue.length ? (
        <Card>
          <PageHeader eyebrow="Queue" title="Pending review" />
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((opportunity) => (
                  <OpportunityRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    busy={busy}
                    onApprove={onApprove}
                    onReject={onReject}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card>
        {!opportunities.length ? (
          <EmptyState
            title="No opportunities in this view"
            message="Create a manual listing or wait for organization and Himalayas submissions."
          />
        ) : (
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <OpportunityRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    busy={busy}
                    onApprove={onApprove}
                    onReject={onReject}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default AdminOpportunitiesPage
