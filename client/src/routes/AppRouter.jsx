import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../pages/AppLayout.jsx'
import AchievementsPage from '../pages/AchievementsPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import OpportunitiesPage from '../pages/OpportunitiesPage.jsx'
import OpportunityDetailsPage from '../pages/OpportunityDetailsPage.jsx'
import SavedOpportunitiesPage from '../pages/SavedOpportunitiesPage.jsx'
import LandingPage from '../pages/LandingPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import OnboardingLayout from '../pages/OnboardingLayout.jsx'
import OnboardingPage from '../pages/onboarding/OnboardingPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import RoadmapsPage from '../pages/RoadmapsPage.jsx'
import SkillsPage from '../pages/SkillsPage.jsx'
import { GuestRoute, OrganizationRoute, ProtectedRoute, StudentAppRoute, AdminRoute } from './guards.jsx'
import { PATHS } from './paths.js'
import OrganizationDashboardPage from '../pages/organization/OrganizationDashboardPage.jsx'
import OrganizationMembersPage from '../pages/organization/OrganizationMembersPage.jsx'
import OrganizationOpportunitiesPage from '../pages/organization/OrganizationOpportunitiesPage.jsx'
import OrganizationOpportunityDetailsPage from '../pages/organization/OrganizationOpportunityDetailsPage.jsx'
import OrganizationOpportunityEditPage from '../pages/organization/OrganizationOpportunityEditPage.jsx'
import OrganizationOpportunityNewPage from '../pages/organization/OrganizationOpportunityNewPage.jsx'
import OrganizationProfilePage from '../pages/organization/OrganizationProfilePage.jsx'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import AdminOpportunitiesPage from '../pages/admin/AdminOpportunitiesPage.jsx'
import AdminOpportunityDetailsPage from '../pages/admin/AdminOpportunityDetailsPage.jsx'
import AdminOpportunityFormPage from '../pages/admin/AdminOpportunityFormPage.jsx'
import AdminOrganizationsPage from '../pages/admin/AdminOrganizationsPage.jsx'
import AdminCareerPathRequestsPage from '../pages/admin/AdminCareerPathRequestsPage.jsx'
import AdminRoadmapsPage from '../pages/admin/AdminRoadmapsPage.jsx'
import AdminRoadmapDetailsPage from '../pages/admin/AdminRoadmapDetailsPage.jsx'
import AdminRoadmapPreviewPage from '../pages/admin/AdminRoadmapPreviewPage.jsx'
import AdminRoadmapStepFormPage from '../pages/admin/AdminRoadmapStepFormPage.jsx'
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx'
import AdminUserDetailsPage from '../pages/admin/AdminUserDetailsPage.jsx'
import AdminSubscriptionsPage from '../pages/admin/AdminSubscriptionsPage.jsx'
import AdminSubscriptionDetailsPage from '../pages/admin/AdminSubscriptionDetailsPage.jsx'
import AiStudioPage from '../pages/AiStudioPage.jsx'

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
            <Route element={<StudentAppRoute />}>
              <Route path={PATHS.DASHBOARD} element={<DashboardPage />} />
              <Route path={PATHS.PROFILE} element={<ProfilePage />} />
              <Route path={PATHS.SKILLS} element={<SkillsPage />} />
              <Route path={PATHS.ROADMAP} element={<RoadmapsPage />} />
              <Route path={PATHS.SAVED} element={<SavedOpportunitiesPage />} />
              <Route path={PATHS.OPPORTUNITIES} element={<OpportunitiesPage />} />
              <Route path="/opportunities/:id" element={<OpportunityDetailsPage />} />
              <Route path={PATHS.AI_STUDIO} element={<AiStudioPage />} />
              <Route path={PATHS.ACHIEVEMENTS} element={<AchievementsPage />} />
            </Route>
            <Route element={<OrganizationRoute />}>
              <Route path={PATHS.ORGANIZATION} element={<OrganizationDashboardPage />} />
              <Route path={PATHS.ORGANIZATION_PROFILE} element={<OrganizationProfilePage />} />
              <Route path={PATHS.ORGANIZATION_MEMBERS} element={<OrganizationMembersPage />} />
              <Route path={PATHS.ORGANIZATION_OPPORTUNITIES} element={<OrganizationOpportunitiesPage />} />
              <Route path={PATHS.ORGANIZATION_OPPORTUNITY_NEW} element={<OrganizationOpportunityNewPage />} />
              <Route path="/organization/opportunities/:id/edit" element={<OrganizationOpportunityEditPage />} />
              <Route path="/organization/opportunities/:id" element={<OrganizationOpportunityDetailsPage />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path={PATHS.ADMIN} element={<AdminDashboardPage />} />
              <Route path={PATHS.ADMIN_OPPORTUNITIES} element={<AdminOpportunitiesPage />} />
              <Route path={PATHS.ADMIN_OPPORTUNITY_NEW} element={<AdminOpportunityFormPage mode="create" />} />
              <Route path="/admin/opportunities/:id/edit" element={<AdminOpportunityFormPage mode="edit" />} />
              <Route path="/admin/opportunities/:id" element={<AdminOpportunityDetailsPage />} />
              <Route path={PATHS.ADMIN_ORGANIZATIONS} element={<AdminOrganizationsPage />} />
              <Route path={PATHS.ADMIN_CAREER_PATH_REQUESTS} element={<AdminCareerPathRequestsPage />} />
              <Route path={PATHS.ADMIN_ROADMAPS} element={<AdminRoadmapsPage />} />
              <Route path="/admin/roadmaps/:id/preview" element={<AdminRoadmapPreviewPage />} />
              <Route path="/admin/roadmaps/:id/steps/new" element={<AdminRoadmapStepFormPage mode="create" />} />
              <Route path="/admin/roadmaps/:id/steps/:stepId/edit" element={<AdminRoadmapStepFormPage mode="edit" />} />
              <Route path="/admin/roadmaps/:id" element={<AdminRoadmapDetailsPage />} />
              <Route path={PATHS.ADMIN_USERS} element={<AdminUsersPage />} />
              <Route path="/admin/users/:id" element={<AdminUserDetailsPage />} />
              <Route path={PATHS.ADMIN_SUBSCRIPTIONS} element={<AdminSubscriptionsPage />} />
              <Route path="/admin/subscriptions/:id" element={<AdminSubscriptionDetailsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path={PATHS.ROOT} element={<LandingPage />} />
        <Route path="*" element={<Navigate to={PATHS.ROOT} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
