import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import OpportunityMatch from '../components/opportunities/OpportunityMatch.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useOpportunitySave } from '../hooks/useOpportunitySave.js'
import { PATHS } from '../routes/paths.js'
import { getApiError } from '../services/api.js'
import { fetchOpportunity } from '../services/opportunityService.js'
import { deadlineTone, formatDeadline, opportunityId } from '../utils/opportunity.js'

function OpportunityDetailsPage() {
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [opportunity, setOpportunity] = useState(null)

  const applySaved = useCallback((_id, saved) => {
    setOpportunity((current) => (current ? { ...current, saved } : current))
  }, [])

  const { pendingId, error: saveError, toggleSave } = useOpportunitySave(applySaved)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchOpportunity(id)
      setOpportunity(data.opportunity)
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Opportunity not found'))
      setOpportunity(null)
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return <LoadingState title="Loading opportunity" message="Fetching the selected listing." />
  }

  if (status === 'error' || !opportunity) {
    return (
      <div>
        <PageHeader eyebrow="Opportunity Hub" title="Opportunity" />
        <ErrorState
          title="Opportunity not found"
          message={error || 'This listing is not available.'}
          onRetry={load}
        />
        <p style={{ marginTop: '1rem' }}>
          <Link to={PATHS.OPPORTUNITIES}>Back to Opportunity Hub</Link>
        </p>
      </div>
    )
  }

  const required =
    opportunity.requiredSkillNames?.length
      ? opportunity.requiredSkillNames.join(', ')
      : opportunity.requiredSkills || 'Not specified'
  const missing = opportunity.skillMatch?.missing || []
  const canApply = Boolean(opportunity.hasValidApplicationUrl && opportunity.applicationUrl)
  const saving = pendingId === opportunityId(opportunity)

  return (
    <div>
      <PageHeader
        eyebrow={opportunity.type}
        title={opportunity.title}
        description={opportunity.organization}
        actions={
          <Badge tone={deadlineTone(opportunity.deadlineStatus)}>
            {opportunity.deadlineStatusLabel}
          </Badge>
        }
      />

      <Card as="article" className="opportunity-detail">
        <dl className="opportunity-dl">
          <div>
            <dt>Organization</dt>
            <dd>{opportunity.organization}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{opportunity.type}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{opportunity.description || 'No description provided.'}</dd>
          </div>
          <div>
            <dt>Eligibility</dt>
            <dd>{opportunity.eligibility || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Required skills</dt>
            <dd>{required}</dd>
          </div>
          <div>
            <dt>Skill match</dt>
            <dd>
              <OpportunityMatch opportunity={opportunity} />
            </dd>
          </div>
          {opportunity.skillMatch?.hasUserSkills ? (
            <>
              <div>
                <dt>Missing skills</dt>
                <dd>{missing.length ? missing.join(', ') : 'None'}</dd>
              </div>
            </>
          ) : null}
          <div>
            <dt>Location</dt>
            <dd>{opportunity.location || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd>{formatDeadline(opportunity.deadline)}</dd>
          </div>
          {opportunity.sourceLabel && opportunity.sourceLabel !== 'PathForge' ? (
            <div>
              <dt>Source</dt>
              <dd>{opportunity.sourceLabel}</dd>
            </div>
          ) : null}
        </dl>

        {saveError ? <p className="pf-form-alert">{saveError}</p> : null}

        <div className="opportunity-card__actions">
          {canApply ? (
            <a
              className="pf-btn pf-btn-primary"
              href={opportunity.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apply
              <ExternalLink size={16} />
            </a>
          ) : (
            <p className="pf-muted">No application link is available yet.</p>
          )}
          <Button
            variant="ghost"
            className={opportunity.saved ? 'opportunity-card__save is-on' : 'opportunity-card__save'}
            onClick={() => toggleSave(opportunity)}
            disabled={saving}
            aria-pressed={Boolean(opportunity.saved)}
          >
            {opportunity.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {opportunity.saved ? 'Saved' : 'Save'}
          </Button>
          <Link to={PATHS.OPPORTUNITIES} className="pf-btn pf-btn-secondary">
            Back to hub
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default OpportunityDetailsPage
