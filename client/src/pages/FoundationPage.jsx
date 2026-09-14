import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react'
import BrandMark from '../components/BrandMark.jsx'
import { useHealth } from '../hooks/useHealth.js'
import { API_URL } from '../utils/constants.js'

function FoundationPage() {
  const { status, data, error } = useHealth()

  const statusLabel = {
    loading: 'Checking API connection',
    success: 'API connected',
    error: 'API unreachable',
  }[status]

  const StatusIcon = {
    loading: LoaderCircle,
    success: CheckCircle2,
    error: AlertCircle,
  }[status]

  return (
    <div className="foundation">
      <aside className="foundation__brand">
        <div className="foundation__mark">
          <BrandMark className="foundation__logo" />
          <span className="foundation__name">PathForge</span>
        </div>

        <div>
          <h1 className="foundation__headline">
            Career paths, built with intention.
          </h1>
          <p className="foundation__lede">
            A premium career and learning platform. This screen confirms the
            Phase 0 foundation only.
          </p>
        </div>

        <p className="foundation__phase">Phase 0 · Foundation</p>
      </aside>

      <main className="foundation__content">
        <section className="pf-card foundation__panel">
          <p className="pf-eyebrow">Development status</p>
          <h2 className="foundation__title">Application scaffold</h2>
          <p className="pf-muted">
            Authentication, onboarding, roadmaps, and product features will be
            added in later phases. No placeholder product data is shown here.
          </p>

          <div className={`foundation__status foundation__status--${status}`}>
            <StatusIcon
              className="foundation__status-icon"
              aria-hidden="true"
            />
            <div>
              <p className="foundation__status-label">{statusLabel}</p>
              <p className="foundation__status-message">
                {status === 'success' && data?.message}
                {status === 'error' && error}
                {status === 'loading' && 'Requesting GET /api/health'}
              </p>
            </div>
          </div>

          <p className="foundation__meta">{API_URL || 'VITE_API_URL is not set'}</p>
        </section>
      </main>
    </div>
  )
}

export default FoundationPage
