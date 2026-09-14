import { Outlet } from 'react-router-dom'
import AppShell from '../layouts/AppShell.jsx'

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default AppLayout
