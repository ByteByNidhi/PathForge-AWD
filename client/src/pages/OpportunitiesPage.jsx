import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import OpportunityCard from '../components/opportunities/OpportunityCard.jsx'
import OpportunityFilters from '../components/opportunities/OpportunityFilters.jsx'
import OpportunitySearch from '../components/opportunities/OpportunitySearch.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useOpportunitySave } from '../hooks/useOpportunitySave.js'
import { PATHS } from '../routes/paths.js'
import { getApiError } from '../services/api.js'
import { fetchOpportunities } from '../services/opportunityService.js'
import { opportunityId } from '../utils/opportunity.js'

function readFilters(params) {
  return {
    search: params.get('search') || params.get('q') || '',
    type: params.get('type') || '',
    location: params.get('location') || '',
    skill: params.get('skill') || '',
    status: params.get('status') || '',
    sort: params.get('sort') || 'match',
  }
}

function OpportunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const [status, setStatus] = useState('loading')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [opportunities, setOpportunities] = useState([])
  const [meta, setMeta] = useState({
    types: [],
    locations: [],
    skillOptions: [],
    totalCount: 0,
    hasUserSkills: false,
    hasFilters: false,
  })
  const statusRef = useRef(status)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const applySaved = useCallback((id, saved) => {
    setOpportunities((current) =>
      current.map((item) => (opportunityId(item) === id ? { ...item, saved } : item))
    )
  }, [])

  const { pendingId, error: saveError, toggleSave } = useOpportunitySave(applySaved)

  const load = useCallback(async () => {
    const quiet = statusRef.current === 'success'
    setError('')
    setRefreshing(quiet)
    if (!quiet) {
      setStatus('loading')
    }
    try {
      const data = await fetchOpportunities(filters)
      setOpportunities(data.opportunities || [])
      setMeta({
        types: data.types || [],
        locations: data.locations || [],
        skillOptions: data.skillOptions || [],
        totalCount: data.totalCount || 0,
        hasUserSkills: Boolean(data.hasUserSkills),
        hasFilters: Boolean(data.hasFilters),
      })
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Opportunities could not be loaded. Please try again.'))
      setStatus(statusRef.current === 'success' ? 'success' : 'error')
    } finally {
      setRefreshing(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const updateFilters = useCallback(
    (next) => {
      const merged = { ...filters, ...next }
      const params = {}
      if (merged.search) params.search = merged.search
      if (merged.type) params.type = merged.type
      if (merged.location) params.location = merged.location
      if (merged.skill) params.skill = merged.skill
      if (merged.status) params.status = merged.status
      if (merged.sort && merged.sort !== 'match') params.sort = merged.sort
      setSearchParams(params)
    },
    [filters, setSearchParams]
  )

  const clearFilters = () => setSearchParams({})

  if (status === 'loading' && !opportunities.length && !meta.totalCount) {
    return (
      <LoadingState
        title="Loading opportunities"
        message="Fetching hackathons, internships, scholarships, and research roles."
      />
    )
  }

  if (status === 'error' && !opportunities.length && !meta.totalCount) {
    return <ErrorState message={error} onRetry={() => load()} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Market"
        title="Opportunity Hub"
        description="Discover hackathons, internships, scholarships, and research opportunities matched to your skills."
        actions={
          <Link to={PATHS.SAVED} className="pf-btn pf-btn-secondary">
            Saved opportunities
          </Link>
        }
      />

      <section className="page-stack">
        <div className="opportunity-toolbar">
          <OpportunitySearch value={filters.search} onChange={(search) => updateFilters({ search })} />
          <OpportunityFilters
            types={meta.types}
            locations={meta.locations}
            skillOptions={meta.skillOptions}
            selectedType={filters.type}
            selectedLocation={filters.location}
            selectedSkill={filters.skill}
            selectedStatus={filters.status}
            sort={filters.sort}
            onChange={updateFilters}
          />
        </div>

        <p className="opportunity-count pf-muted">
          {meta.hasFilters
            ? `Showing ${opportunities.length} of ${meta.totalCount} opportunities`
            : `${meta.totalCount} ${meta.totalCount === 1 ? 'opportunity' : 'opportunities'} available`}
        </p>

        {!meta.hasUserSkills ? (
          <p className="opportunity-hint pf-muted">
            Skill matching becomes available after you{' '}
            <Link to={PATHS.SKILLS}>add catalogue or custom skills</Link>.
          </p>
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={() => load()} />
        ) : null}
        {saveError ? <p className="pf-form-alert">{saveError}</p> : null}
        {refreshing ? <p className="pf-muted">Updating results…</p> : null}

        {meta.totalCount === 0 ? (
          <EmptyState
            title="No opportunities are available yet"
            message="Approved opportunities will appear here when they are published."
          />
        ) : opportunities.length === 0 ? (
          <EmptyState
            title="No opportunities match your filters"
            message="Try a different search, type, location, skill, or deadline status."
            action={
              <Button type="button" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
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
        )}
      </section>
    </div>
  )
}

export default OpportunitiesPage
