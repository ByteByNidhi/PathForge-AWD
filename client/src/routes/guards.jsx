import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingState from '../components/ui/LoadingState.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getPostAuthPath, isAdmin } from '../utils/auth.js'
import { isOrganizationUser } from '../utils/organization.js'
import { PATHS } from './paths.js'

export function GuestRoute() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="auth-panel">
        <LoadingState title="Restoring session" message="Checking your PathForge account." />
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to={getPostAuthPath(user)} replace state={{ from: location }} />
  }

  return <Outlet />
}

export function ProtectedRoute({ requireOnboarding = true }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="app-content">
        <LoadingState title="Loading PathForge" message="Checking your session." />
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to={PATHS.LOGIN} replace state={{ from: location }} />
  }

  const needsOnboarding = user.role === 'student' && !user.onboardingCompleted
  const onOnboarding = location.pathname === PATHS.ONBOARDING

  if (needsOnboarding && requireOnboarding && !onOnboarding) {
    return <Navigate to={PATHS.ONBOARDING} replace />
  }

  if (!needsOnboarding && onOnboarding) {
    return <Navigate to={getPostAuthPath(user)} replace />
  }

  return <Outlet />
}

export function StudentAppRoute() {
  const { user } = useAuth()

  if (isOrganizationUser(user)) {
    return <Navigate to={PATHS.ORGANIZATION} replace />
  }

  return <Outlet />
}

export function OrganizationRoute() {
  const { user } = useAuth()

  if (!isOrganizationUser(user)) {
    return <Navigate to={getPostAuthPath(user)} replace />
  }

  return <Outlet />
}

export function AdminRoute() {
  const { user } = useAuth()

  if (!isAdmin(user)) {
    return <Navigate to={getPostAuthPath(user)} replace />
  }

  return <Outlet />
}
