import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import {
  deleteOrganizationOpportunity,
  fetchOrganizationOpportunity,
  submitOrganizationOpportunity,
} from '../../services/organizationService.js'
import { approvalLabel, approvalTone, formatDate } from '../../utils/organization.js'

function OrganizationOpportunityDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [opportunity, setOpportunity] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchOrganizationOpportunity(id)
      setOpportunity(data.opportunity)
      setIsOwner(Boolean(data.isOwner || data.permissions?.isOwner))
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load opportunity'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const onSubmit = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await submitOrganizationOpportunity(opportunity.id)
      setOpportunity(result.opportunity)
      setMessage(result.message)
    } catch (err) {
      setError(getApiError(err, 'Unable to submit opportunity'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!window.confirm('Delete this draft opportunity?')) {
      return
    }
    setBusy(true)
    setError('')
    try {
      await deleteOrganizationOpportunity(opportunity.id)
      navigate(PATHS.ORGANIZATION_OPPORTUNITIES)
    } catch (err) {
      setError(getApiError(err, 'Unable to delete opportunity'))
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading opportunity" message="Fetching organization listing details." />
  }

  if (status === 'error' || !opportunity) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title={opportunity.title}
        description={`${opportunity.organization} · ${opportunity.type}`}
        actions={
          <Badge tone={approvalTone(opportunity.approvalStatus)}>
            {approvalLabel(opportunity.approvalStatus)}
          </Badge>
        }
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      {opportunity.approvalStatus === 'rejected' && opportunity.rejectionReason ? (
        <Card>
          <p className="pf-eyebrow">Rejection reason</p>
          <p>{opportunity.rejectionReason}</p>
        </Card>
      ) : null}

      <Card>
        <dl className="opportunity-dl">
          <div>
            <dt>Description</dt>
            <dd>{opportunity.description || '—'}</dd>
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
            <dd>{opportunity.applicationUrl || '—'}</dd>
          </div>
          <div>
            <dt>Eligibility</dt>
            <dd>{opportunity.eligibility || '—'}</dd>
          </div>
          <div>
            <dt>Required skills</dt>
            <dd>{opportunity.requiredSkills || 'Open to all'}</dd>
          </div>
        </dl>
        <div className="org-actions">
          <Link to={PATHS.ORGANIZATION_OPPORTUNITIES} className="pf-btn pf-btn-secondary">
            Back
          </Link>
          {isOwner && opportunity.canEdit ? (
            <Link to={PATHS.organizationOpportunityEdit(opportunity.id)} className="pf-btn pf-btn-secondary">
              Edit
            </Link>
          ) : null}
          {isOwner && opportunity.canSubmit ? (
            <Button onClick={onSubmit} disabled={busy}>
              {opportunity.approvalStatus === 'rejected' ? 'Resubmit' : 'Submit for Review'}
            </Button>
          ) : null}
          {isOwner && opportunity.canDelete ? (
            <Button variant="danger" onClick={onDelete} disabled={busy}>
              Delete
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

export default OrganizationOpportunityDetailsPage
