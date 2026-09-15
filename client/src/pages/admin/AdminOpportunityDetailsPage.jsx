import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import {
  approveAdminOpportunity,
  deleteAdminOpportunity,
  fetchAdminOpportunity,
  rejectAdminOpportunity,
} from '../../services/adminService.js'
import { approvalLabel, approvalTone, formatDate } from '../../utils/organization.js'

function AdminOpportunityDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [opportunity, setOpportunity] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminOpportunity(id)
      setOpportunity(data.opportunity)
      setRejectionReason(data.opportunity.rejectionReason || '')
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load opportunity'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const onApprove = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await approveAdminOpportunity(opportunity.id)
      setOpportunity(result.opportunity)
      setRejectionReason('')
      setMessage(result.message)
    } catch (err) {
      setError(getApiError(err, 'Unable to approve opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onReject = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await rejectAdminOpportunity(opportunity.id, { rejectionReason })
      setOpportunity(result.opportunity)
      setMessage(result.message)
    } catch (err) {
      setError(getApiError(err, 'Unable to reject opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!window.confirm(`Delete “${opportunity.title}”? This cannot be undone.`)) {
      return
    }
    setBusy(true)
    setError('')
    try {
      await deleteAdminOpportunity(opportunity.id)
      navigate(PATHS.ADMIN_OPPORTUNITIES)
    } catch (err) {
      setError(getApiError(err, 'Unable to delete opportunity'))
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading opportunity" message="Fetching listing details." />
  }

  if (status === 'error' || !opportunity) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title={opportunity.title}
        description={`${opportunity.organization} · ${opportunity.type} · ${opportunity.sourceLabel}`}
        actions={
          <Badge tone={approvalTone(opportunity.approvalStatus)}>
            {approvalLabel(opportunity.approvalStatus)}
          </Badge>
        }
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <dl className="opportunity-dl">
          <div>
            <dt>Description</dt>
            <dd>{opportunity.description || '—'}</dd>
          </div>
          <div>
            <dt>Required skills</dt>
            <dd>{opportunity.requiredSkills || '—'}</dd>
          </div>
          <div>
            <dt>Eligibility</dt>
            <dd>{opportunity.eligibility || '—'}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{opportunity.location || '—'}</dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd>{formatDate(opportunity.deadline)}</dd>
          </div>
          <div>
            <dt>Application URL</dt>
            <dd>
              {opportunity.applicationUrl ? (
                <a href={opportunity.applicationUrl} target="_blank" rel="noreferrer">
                  {opportunity.applicationUrl}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{opportunity.sourceLabel}</dd>
          </div>
          {opportunity.externalId ? (
            <div>
              <dt>External ID</dt>
              <dd>{opportunity.externalId}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {opportunity.canReject ? (
        <Card>
          <Textarea
            id="rejection-reason"
            label="Rejection reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            rows={4}
            maxLength={2000}
          />
        </Card>
      ) : null}

      {opportunity.approvalStatus === 'rejected' && opportunity.rejectionReason ? (
        <Card>
          <p className="pf-eyebrow">Current rejection reason</p>
          <p>{opportunity.rejectionReason}</p>
        </Card>
      ) : null}

      <div className="org-actions">
        {opportunity.canApprove ? (
          <Button onClick={onApprove} disabled={busy}>
            Approve
          </Button>
        ) : null}
        {opportunity.canReject ? (
          <Button variant="secondary" onClick={onReject} disabled={busy}>
            Reject
          </Button>
        ) : null}
        <Link to={PATHS.adminOpportunityEdit(opportunity.id)} className="pf-btn pf-btn-secondary">
          Edit
        </Link>
        <Button variant="danger" onClick={onDelete} disabled={busy}>
          Delete
        </Button>
        <Link to={PATHS.ADMIN_OPPORTUNITIES} className="pf-btn pf-btn-ghost">
          Back to list
        </Link>
      </div>
    </div>
  )
}

export default AdminOpportunityDetailsPage
