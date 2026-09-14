import { BrowserRouter, Route, Routes } from 'react-router-dom'
import FoundationPage from '../pages/FoundationPage.jsx'
import { PATHS } from './paths.js'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PATHS.ROOT} element={<FoundationPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
