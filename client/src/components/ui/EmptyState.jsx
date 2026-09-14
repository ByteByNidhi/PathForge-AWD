import { Inbox } from 'lucide-react'

function EmptyState({ title, message, action }) {
  return (
    <div className="pf-card pf-state">
      <Inbox className="pf-state__icon" aria-hidden="true" />
      <h2>{title}</h2>
      {message ? <p className="pf-muted">{message}</p> : null}
      {action}
    </div>
  )
}

export default EmptyState
