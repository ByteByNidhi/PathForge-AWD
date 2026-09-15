import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OrganizationOpportunityTable from '../../components/organization/OrganizationOpportunityTable.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import {
  deleteOrganizationOpportunity,
  fetchOrganizationOpportunities,
  submitOrganizationOpportunity,
} from '../../services/organizationService.js'

function OrganizationOpportunitiesPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [opportunities, setOpportunities] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchOrganizationOpportunities()
      setOpportunities(data.opportunities || [])
      setIsOwner(Boolean(data.isOwner || data.permissions?.isOwner))
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load opportunities'))
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
    return <LoadingState title="Loading opportunities" message="Fetching organization listings." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title="My Opportunities"
        description="Create drafts, submit them for admin review, and track approval status."
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
      <Card>
        {opportunities.length ? (
          <OrganizationOpportunityTable
            opportunities={opportunities}
            isOwner={isOwner}
            onSubmit={onSubmit}
            onDelete={onDelete}
            submitting={busy}
          />
        ) : (
          <EmptyState
            title="No opportunities yet"
            message="Save a draft, then submit it for admin approval. Students only see approved listings."
            action={
              isOwner ? (
                <Link to={PATHS.ORGANIZATION_OPPORTUNITY_NEW} className="pf-btn">
                  Create Opportunity
                </Link>
              ) : null
            }
          />
        )}
      </Card>
    </div>
  )
}

export default OrganizationOpportunitiesPage
