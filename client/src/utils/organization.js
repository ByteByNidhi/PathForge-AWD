export function isOrganizationUser(user) {
  return Boolean(user?.isOrganizationUser || user?.organization)
}

export function approvalLabel(status) {
  if (status === 'pending') {
    return 'Pending review'
  }
  if (status === 'approved') {
    return 'Approved'
  }
  if (status === 'rejected') {
    return 'Rejected'
  }
  return 'Draft'
}

export function approvalTone(status) {
  if (status === 'approved') {
    return 'success'
  }
  if (status === 'pending') {
    return 'warning'
  }
  if (status === 'rejected') {
    return 'warning'
  }
  return 'neutral'
}

export function formatDate(value) {
  if (!value) {
    return 'None'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'None'
  }
  return date.toLocaleDateString()
}

export function toDateInput(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
