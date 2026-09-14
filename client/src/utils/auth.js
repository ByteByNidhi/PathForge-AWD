import { PATHS } from '../routes/paths.js'

export function getPostAuthPath(user) {
  if (user?.role === 'student' && !user.onboardingCompleted) {
    return PATHS.ONBOARDING
  }
  return PATHS.DASHBOARD
}
