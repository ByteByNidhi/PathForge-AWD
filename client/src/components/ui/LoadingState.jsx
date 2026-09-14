import { LoaderCircle } from 'lucide-react'

function LoadingState({ title = 'Loading', message = 'Please wait.' }) {
  return (
    <div className="pf-card pf-state pf-state--loading">
      <LoaderCircle className="pf-state__icon" aria-hidden="true" />
      <h2>{title}</h2>
      <p className="pf-muted">{message}</p>
    </div>
  )
}

export default LoadingState
