import { PATHS } from '../routes/paths.js'
import { isOrganizationUser } from './organization.js'

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function getPostAuthPath(user) {
  if (isAdmin(user)) {
    return PATHS.ADMIN
  }
  if (isOrganizationUser(user)) {
    return PATHS.ORGANIZATION
  }
  if (user?.role === 'student' && !user.onboardingCompleted) {
    return PATHS.ONBOARDING
  }
  return PATHS.DASHBOARD
}
