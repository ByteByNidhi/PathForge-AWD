export const OPPORTUNITY_TYPES = ['Hackathon', 'Internship', 'Scholarship', 'Research']

export const STATUS_OPTIONS = [
  { value: '', label: 'All deadlines' },
  { value: 'open', label: 'Open' },
  { value: 'closing_soon', label: 'Closing Soon' },
  { value: 'closed', label: 'Closed' },
]

export const SORT_OPTIONS = [
  { value: 'match', label: 'Best Match' },
  { value: 'nearest', label: 'Nearest Deadline' },
  { value: 'latest', label: 'Latest' },
]

export function opportunityId(opportunity) {
  return String(opportunity?.id || opportunity?._id || '')
}

export function formatDeadline(value) {
  if (!value) return 'Not specified'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not specified'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function deadlineTone(status) {
  if (status === 'closed') return 'neutral'
  if (status === 'closing_soon') return 'warning'
  return 'success'
}

export function matchPercent(opportunity) {
  const match = opportunity?.skillMatch
  if (!match || match.percent == null) {
    return null
  }
  return match.percent
}

export function hasMeaningfulMatch(opportunity) {
  return matchPercent(opportunity) != null
}
