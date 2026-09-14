import { Outlet } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'

function OnboardingLayout() {
  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="auth-visual__brand">
          <BrandMark className="auth-visual__logo" />
          <span className="auth-visual__name">PathForge</span>
        </div>
        <div>
          <p className="pf-eyebrow" style={{ color: 'var(--color-brand-sage-soft)' }}>
            Three steps
          </p>
          <h1>Career path, skills, confirm.</h1>
          <p>This is the same onboarding sequence as PathForge-WFS, presented in the AWD visual system.</p>
        </div>
        <p className="auth-visual__note">Beginners can finish with zero skills.</p>
      </section>
      <main className="auth-panel" style={{ alignItems: 'stretch', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default OnboardingLayout
