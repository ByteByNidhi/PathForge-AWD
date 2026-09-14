import { AlertCircle } from 'lucide-react'
import Button from './Button.jsx'

function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="pf-card pf-state pf-state--error">
      <AlertCircle className="pf-state__icon" aria-hidden="true" />
      <h2>{title}</h2>
      {message ? <p className="pf-muted">{message}</p> : null}
      {onRetry ? (
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export default ErrorState
