import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { PATHS } from '../../routes/paths.js'
import { getApiError } from '../../services/api.js'
import { fetchAdminRoadmaps } from '../../services/adminService.js'

function AdminRoadmapsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [paths, setPaths] = useState([])

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAdminRoadmaps()
      setPaths(data.paths || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load roadmaps'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return <LoadingState title="Loading roadmaps" message="Fetching career paths." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Admin"
        title="Roadmaps"
        description="Open a path to view curated steps or generate an AI draft. Users only see published steps."
      />

      <Card>
        {!paths.length ? (
          <EmptyState title="No career paths" message="No career paths found." />
        ) : (
          <div className="org-table-wrap">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Source</th>
                  <th>Published steps</th>
                  <th>AI draft</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paths.map((path) => (
                  <tr key={path.id}>
                    <td>
                      <strong>{path.pathName}</strong>
                      {path.description ? <div className="pf-muted">{path.description}</div> : null}
                    </td>
                    <td>
                      <Badge>{path.isAiGenerated ? 'AI-generated' : 'Curated'}</Badge>
                    </td>
                    <td>{path.publishedStepCount}</td>
                    <td>
                      {path.draftStepCount > 0
                        ? `${path.draftStepCount} pending review`
                        : <span className="pf-muted">None</span>}
                    </td>
                    <td>
                      <Link to={PATHS.adminRoadmap(path.id)}>Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default AdminRoadmapsPage
