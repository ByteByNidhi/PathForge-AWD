import { useRef, useState } from 'react'
import { getApiError } from '../services/api.js'
import { saveOpportunity, unsaveOpportunity } from '../services/opportunityService.js'
import { opportunityId } from '../utils/opportunity.js'

export function useOpportunitySave(onSavedChange) {
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState('')
  const inFlight = useRef(new Set())

  const toggleSave = async (opportunity) => {
    const id = opportunityId(opportunity)
    if (!id || inFlight.current.has(id)) {
      return
    }

    inFlight.current.add(id)
    setPendingId(id)
    setError('')

    try {
      if (opportunity.saved) {
        await unsaveOpportunity(id)
        onSavedChange?.(id, false)
      } else {
        await saveOpportunity(id)
        onSavedChange?.(id, true)
      }
    } catch (err) {
      setError(getApiError(err, 'Unable to update saved opportunities'))
    } finally {
      inFlight.current.delete(id)
      setPendingId('')
    }
  }

  return { pendingId, error, setError, toggleSave }
}
