import {
  Award,
  Bookmark,
  Bot,
  Briefcase,
  Building2,
  Compass,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  Shield,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PATHS } from '../routes/paths.js'
import { isAdmin } from '../utils/auth.js'
import { isOrganizationUser } from '../utils/organization.js'

const STUDENT_NAV_ITEMS = [
  { to: PATHS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: PATHS.ROADMAP, label: 'Roadmaps', icon: Compass },
  { to: PATHS.OPPORTUNITIES, label: 'Opportunity Hub', icon: Briefcase, end: true },
  { to: PATHS.SAVED, label: 'Saved', icon: Bookmark },
  { to: PATHS.ACHIEVEMENTS, label: 'Achievements', icon: Award },
  { to: PATHS.AI_STUDIO, label: 'AI Studio', icon: Bot },
  { to: PATHS.PROFILE, label: 'Profile', icon: UserRound },
]

const ORGANIZATION_NAV_ITEMS = [
  { to: PATHS.ORGANIZATION, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: PATHS.ORGANIZATION_OPPORTUNITIES, label: 'Opportunities', icon: Briefcase },
  { to: PATHS.ORGANIZATION_PROFILE, label: 'Profile', icon: Building2 },
  { to: PATHS.ORGANIZATION_MEMBERS, label: 'Members', icon: Users },
]

const ADMIN_NAV_ITEMS = [
  { to: PATHS.ADMIN, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: PATHS.ADMIN_OPPORTUNITIES, label: 'Opportunities', icon: Briefcase },
  { to: PATHS.ADMIN_ORGANIZATIONS, label: 'Organizations', icon: Building2 },
  { to: PATHS.ADMIN_ROADMAPS, label: 'Roadmaps', icon: Compass },
  { to: PATHS.ADMIN_USERS, label: 'Users', icon: Users },
  { to: PATHS.ADMIN_CAREER_PATH_REQUESTS, label: 'Career Path Requests', icon: Route },
  { to: PATHS.ADMIN_SUBSCRIPTIONS, label: 'Subscriptions', icon: CreditCard },
]

function isAdminOpportunitiesActive(pathname) {
  return pathname === PATHS.ADMIN_OPPORTUNITIES || pathname.startsWith(`${PATHS.ADMIN_OPPORTUNITIES}/`)
}

function isOpportunityHubActive(pathname) {
  if (pathname === PATHS.SAVED) {
    return false
  }
  return pathname === PATHS.OPPORTUNITIES || pathname.startsWith(`${PATHS.OPPORTUNITIES}/`)
}

function isAdminRoadmapsActive(pathname) {
  return pathname === PATHS.ADMIN_ROADMAPS || pathname.startsWith(`${PATHS.ADMIN_ROADMAPS}/`)
}

function isAdminUsersActive(pathname) {
  return pathname === PATHS.ADMIN_USERS || pathname.startsWith(`${PATHS.ADMIN_USERS}/`)
}

function isAdminSubscriptionsActive(pathname) {
  return pathname === PATHS.ADMIN_SUBSCRIPTIONS || pathname.startsWith(`${PATHS.ADMIN_SUBSCRIPTIONS}/`)
}

function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const adminPanel = isAdmin(user) && location.pathname.startsWith(PATHS.ADMIN)
  const organizationNav = isOrganizationUser(user)
  const navItems = adminPanel
    ? ADMIN_NAV_ITEMS
    : organizationNav
      ? ORGANIZATION_NAV_ITEMS
      : [
          ...STUDENT_NAV_ITEMS,
          ...(isAdmin(user) ? [{ to: PATHS.ADMIN, label: 'Admin', icon: Shield, end: false }] : []),
        ]

  return (
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`.trim()}>
      <div className="app-sidebar__brand">
        <BrandMark className="app-sidebar__logo" />
        <span className="app-sidebar__name">PathForge</span>
      </div>

      <nav aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => {
              let active = isActive
              if (!adminPanel && !organizationNav && item.to === PATHS.OPPORTUNITIES) {
                active = isOpportunityHubActive(location.pathname)
              }
              if (adminPanel && item.to === PATHS.ADMIN_OPPORTUNITIES) {
                active = isAdminOpportunitiesActive(location.pathname)
              }
              if (adminPanel && item.to === PATHS.ADMIN_ROADMAPS) {
                active = isAdminRoadmapsActive(location.pathname)
              }
              if (adminPanel && item.to === PATHS.ADMIN_USERS) {
                active = isAdminUsersActive(location.pathname)
              }
              if (adminPanel && item.to === PATHS.ADMIN_SUBSCRIPTIONS) {
                active = isAdminSubscriptionsActive(location.pathname)
              }
              return `app-nav-link ${active ? 'is-active' : ''}`
            }}
            onClick={onClose}
          >
            <item.icon aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar__footer">
        <button
          type="button"
          className="app-nav-link"
          onClick={() => {
            logout()
            navigate(PATHS.LOGIN)
          }}
        >
          <LogOut aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  )
}

function Topbar({ onOpenMenu }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const profilePath = isOrganizationUser(user)
    ? PATHS.ORGANIZATION_PROFILE
    : isAdmin(user)
      ? PATHS.ADMIN
      : PATHS.PROFILE

  return (
    <header className="app-topbar">
      <button
        type="button"
        className="app-icon-btn app-menu-toggle"
        onClick={onOpenMenu}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="app-topbar__actions">
        <div className="app-user-menu">
          <button
            type="button"
            className="app-icon-btn"
            style={{ width: 'auto', padding: '0 0.5rem', gap: '0.5rem' }}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar name={user?.name} />
            <span className="app-user-name pf-muted">{user?.name}</span>
          </button>
          {menuOpen ? (
            <Card className="app-user-menu__panel">
              <Button
                variant="ghost"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(profilePath)
                }}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  logout()
                  navigate(PATHS.LOGIN)
                }}
              >
                Logout
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      {sidebarOpen ? (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar onOpenMenu={() => setSidebarOpen(true)} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}

export default AppShell
