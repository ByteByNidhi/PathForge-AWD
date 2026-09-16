import { Outlet } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'

function OnboardingLayout() {
  return (
    <div className="onboarding-shell">
      <section className="onboarding-shell__visual">
        <div className="auth-visual__brand">
          <BrandMark className="auth-visual__logo" />
          <span className="auth-visual__name">PathForge</span>
        </div>
        <div>
          <p className="pf-eyebrow" style={{ color: 'var(--color-brand-sage-soft)' }}>
            Three steps
          </p>
          <h1>Career path, skills, confirm.</h1>
          <p>Tell us where you are starting. Catalogue skills stay available, and experienced students can add a skill by name.</p>
        </div>
        <p className="auth-visual__note">Beginners can finish with zero skills.</p>
      </section>
      <main className="onboarding-shell__panel">
        <Outlet />
      </main>
    </div>
  )
}

export default OnboardingLayout
