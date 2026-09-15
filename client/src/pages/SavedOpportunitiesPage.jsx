import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OpportunityCard from '../components/opportunities/OpportunityCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useOpportunitySave } from '../hooks/useOpportunitySave.js'
import { PATHS } from '../routes/paths.js'
import { getApiError } from '../services/api.js'
import { fetchSavedOpportunities } from '../services/opportunityService.js'
import { opportunityId } from '../utils/opportunity.js'

function SavedOpportunitiesPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [opportunities, setOpportunities] = useState([])

  const applySaved = useCallback((id, saved) => {
    setOpportunities((current) =>
      saved
        ? current.map((item) => (opportunityId(item) === id ? { ...item, saved } : item))
        : current.filter((item) => opportunityId(item) !== id)
    )
  }, [])

  const { pendingId, error: saveError, toggleSave } = useOpportunitySave(applySaved)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchSavedOpportunities()
      setOpportunities(data.opportunities || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load saved opportunities'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return (
      <LoadingState title="Loading saved opportunities" message="Fetching listings you have saved." />
    )
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Market"
        title="Saved opportunities"
        description="Opportunities you have saved from the Opportunity Hub."
        actions={
          <Link to={PATHS.OPPORTUNITIES} className="pf-btn pf-btn-secondary">
            Back to Opportunity Hub
          </Link>
        }
      />

      {saveError ? <p className="pf-form-alert">{saveError}</p> : null}

      {opportunities.length ? (
        <div className="opportunity-list">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunityId(opportunity)}
              opportunity={opportunity}
              pending={pendingId}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="You have not saved any opportunities yet"
          message="Open the Opportunity Hub and save listings you want to revisit."
          action={
            <Link to={PATHS.OPPORTUNITIES} className="pf-btn pf-btn-primary">
              Browse opportunities
            </Link>
          }
        />
      )}
    </div>
  )
}

export default SavedOpportunitiesPage
