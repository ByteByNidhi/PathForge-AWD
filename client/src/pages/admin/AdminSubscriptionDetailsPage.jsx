import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminSubscription, upgradeAdminSubscription } from '../../services/adminService.js'

function AdminSubscriptionDetailsPage() {
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [upgrading, setUpgrading] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminSubscription(id)
      setSubscription(data.subscription)
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load this subscription'))
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const onUpgrade = async () => {
    setUpgrading(true)
    setError('')
    setMessage('')
    try {
      const result = await upgradeAdminSubscription(id)
      setMessage(result.message)
      setSubscription(result.subscription)
    } catch (err) {
      setError(getApiError(err, 'Unable to run the demonstration upgrade'))
    } finally {
      setUpgrading(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading subscription" message="Fetching the demonstration record." />
  }

  if (status === 'error' || !subscription) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Subscription Details"
        description="Demonstration record. Payment method is not connected."
        actions={
          <div className="org-actions">
            <Link to={PATHS.ADMIN_SUBSCRIPTIONS} className="pf-btn pf-btn-secondary">Back</Link>
            <Button onClick={onUpgrade} disabled={upgrading}>
              {upgrading ? 'Working…' : 'Upgrade Plan'}
            </Button>
          </div>
        }
      />

      {message ? <div className="pf-flash">{message}</div> : null}
      {error ? <div className="pf-form-alert">{error}</div> : null}

      <Card>
        <dl className="pf-studio__meta">
          <dt>User</dt>
          <dd>{subscription.user} ({subscription.email})</dd>
          <dt>Plan</dt>
          <dd>{subscription.plan}</dd>
          <dt>Status</dt>
          <dd>{subscription.status}</dd>
          <dt>Start Date</dt>
          <dd>{subscription.startDate}</dd>
          <dt>Next Renewal</dt>
          <dd>{subscription.renewsOn}</dd>
          <dt>Amount</dt>
          <dd>₹{Number(subscription.amount).toLocaleString()}</dd>
          <dt>Payment Method</dt>
          <dd>{subscription.paymentMethod}</dd>
        </dl>
      </Card>

      <Card>
        <h2>Payment History</h2>
        <div className="org-table-wrap">
          <table className="org-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(subscription.history || []).map((row, index) => (
                <tr key={`${row.date}-${index}`}>
                  <td>{row.date}</td>
                  <td>₹{Number(row.amount).toLocaleString()}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default AdminSubscriptionDetailsPage
