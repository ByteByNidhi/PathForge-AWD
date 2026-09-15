import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../pages/AppLayout.jsx'
import AchievementsPage from '../pages/AchievementsPage.jsx'
import ComingSoonPage from '../pages/ComingSoonPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import OnboardingLayout from '../pages/OnboardingLayout.jsx'
import OnboardingPage from '../pages/onboarding/OnboardingPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import RoadmapsPage from '../pages/RoadmapsPage.jsx'
import SkillsPage from '../pages/SkillsPage.jsx'
import { GuestRoute, ProtectedRoute } from './guards.jsx'
import { PATHS } from './paths.js'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path={PATHS.LOGIN} element={<LoginPage />} />
          <Route path={PATHS.REGISTER} element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute requireOnboarding={false} />}>
          <Route element={<OnboardingLayout />}>
            <Route path={PATHS.ONBOARDING} element={<OnboardingPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.DASHBOARD} element={<DashboardPage />} />
            <Route path={PATHS.PROFILE} element={<ProfilePage />} />
            <Route path={PATHS.SKILLS} element={<SkillsPage />} />
            <Route path={PATHS.ROADMAP} element={<RoadmapsPage />} />
            <Route
              path={PATHS.SAVED}
              element={
                <ComingSoonPage
                  title="Saved"
                  description="Saved opportunities belong to the next sprint."
                />
              }
            />
            <Route
              path={PATHS.OPPORTUNITIES}
              element={
                <ComingSoonPage
                  title="Opportunity Hub"
                  description="Opportunity matching and Himalayas import belong to the next sprint."
                />
              }
            />
            <Route
              path={PATHS.AI_STUDIO}
              element={
                <ComingSoonPage
                  title="AI Studio"
                  description="Gemini-powered guidance belongs to a later sprint."
                />
              }
            />
            <Route path={PATHS.ACHIEVEMENTS} element={<AchievementsPage />} />
          </Route>
        </Route>

        <Route path={PATHS.ROOT} element={<Navigate to={PATHS.LOGIN} replace />} />
        <Route path="*" element={<Navigate to={PATHS.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
