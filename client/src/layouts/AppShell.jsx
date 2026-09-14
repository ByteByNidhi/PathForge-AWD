import {
  Award,
  Bookmark,
  Bot,
  Briefcase,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PATHS } from '../routes/paths.js'

const NAV_ITEMS = [
  { to: PATHS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: PATHS.ROADMAP, label: 'Roadmaps', icon: Compass },
  { to: PATHS.OPPORTUNITIES, label: 'Opportunity Hub', icon: Briefcase, end: true },
  { to: PATHS.SAVED, label: 'Saved', icon: Bookmark },
  { to: PATHS.ACHIEVEMENTS, label: 'Achievements', icon: Award },
  { to: PATHS.AI_STUDIO, label: 'AI Studio', icon: Bot },
  { to: PATHS.PROFILE, label: 'Profile', icon: UserRound },
]

function Sidebar({ open, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`.trim()}>
      <div className="app-sidebar__brand">
        <BrandMark className="app-sidebar__logo" />
        <span className="app-sidebar__name">PathForge</span>
      </div>

      <nav aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
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
                  navigate(PATHS.PROFILE)
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
