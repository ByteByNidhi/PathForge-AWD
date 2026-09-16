import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Bot,
  Briefcase,
  Compass,
  Map,
  Sparkles,
} from 'lucide-react'
import BrandMark from '../components/BrandMark.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PATHS } from '../routes/paths.js'
import { getPostAuthPath } from '../utils/auth.js'

const HeroWorld = lazy(() => import('../components/landing/HeroWorld.jsx'))

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Skills',
    text: 'Record catalogue and custom skills so matching, roadmaps, and AI Studio stay grounded in what you actually know.',
  },
  {
    icon: Map,
    title: 'Roadmaps',
    text: 'Follow a published career path one step at a time. Completing a step awards XP and unlocks the next quest.',
  },
  {
    icon: Briefcase,
    title: 'Opportunities',
    text: 'Browse approved internships, hackathons, scholarships, and research roles with skill-match percentages.',
  },
  {
    icon: Bot,
    title: 'AI Studio',
    text: 'Ask a career assistant that reads your PathForge profile, skills, and roadmap — never a client-side API key.',
  },
  {
    icon: Award,
    title: 'XP & achievements',
    text: 'Level up from real progress. Badges unlock from completed steps, skills, XP, and roadmap percent.',
  },
  {
    icon: Compass,
    title: 'A path you can follow',
    text: 'Onboarding sets a career path. Organization partners publish opportunities. Admins keep the catalogue honest.',
  },
]

function LandingPage() {
  const { status, user } = useAuth()
  const signedIn = status === 'authenticated'
  const primaryHref = signedIn ? getPostAuthPath(user) : PATHS.REGISTER
  const primaryLabel = signedIn ? 'Continue' : 'Get Started'
  const secondaryHref = PATHS.LOGIN
  const secondaryLabel = 'Login'

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to={PATHS.ROOT} className="landing-nav__brand">
          <BrandMark className="landing-nav__logo" />
          <span>PathForge</span>
        </Link>
        <nav className="landing-nav__links">
          <Link to={PATHS.LOGIN}>Login</Link>
          <Link to={PATHS.REGISTER} className="pf-btn pf-btn-primary">
            Get Started
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <Suspense fallback={<div className="landing-hero__world landing-hero__world--css" aria-hidden="true" />}>
          <HeroWorld />
        </Suspense>
        <div className="landing-hero__copy">
          <h1>PathForge</h1>
          <p className="landing-hero__subtitle">A quieter map for the career in front of you.</p>
          <p className="landing-hero__lede">
            Record skills, walk a published roadmap, and match real opportunities — without turning
            your next step into a game.
          </p>
          <div className="landing-hero__actions">
            <Link to={primaryHref} className="pf-btn pf-btn-primary">
              {primaryLabel}
            </Link>
            <Link to={secondaryHref} className="pf-btn pf-btn-secondary">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <p className="pf-eyebrow">What PathForge does</p>
        <h2>A career studio, not a feed.</h2>
        <p className="landing-section__intro">
          Students pick a path, record skills, complete published steps, and match against approved
          opportunities. Organizations publish roles. Admins keep the map truthful.
        </p>
        <div className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-feature">
              <feature.icon aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--muted">
        <p className="pf-eyebrow">How it works</p>
        <ol className="landing-steps">
          <li>
            <strong>Choose a career path</strong>
            <span>Start from a published PathForge path, or request another for review.</span>
          </li>
          <li>
            <strong>Record your skills</strong>
            <span>Pick from the catalogue or add a skill by name. Beginners can start at zero.</span>
          </li>
          <li>
            <strong>Walk the roadmap</strong>
            <span>Complete the current published step, earn XP, and unlock achievements.</span>
          </li>
          <li>
            <strong>Match opportunities</strong>
            <span>Save and apply to approved listings whose required skills overlap yours.</span>
          </li>
        </ol>
      </section>

      <section className="landing-cta">
        <h2>Begin with a path, not a pitch.</h2>
        <p>Create a student account and finish onboarding in three short steps.</p>
        <Link to={PATHS.REGISTER} className="pf-btn pf-btn-primary">
          Create your account
        </Link>
      </section>
    </div>
  )
}

export default LandingPage
