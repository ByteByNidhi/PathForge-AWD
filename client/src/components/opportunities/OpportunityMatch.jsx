import { Link } from 'react-router-dom'
import { PATHS } from '../../routes/paths.js'

function OpportunityMatch({ opportunity, compact = false }) {
  const match = opportunity?.skillMatch

  if (!match || !match.hasUserSkills) {
    return (
      <p className="opportunity-match">
        <Link to={PATHS.SKILLS}>Add your skills to calculate your match</Link>
      </p>
    )
  }

  if (match.percent == null) {
    return (
      <p className="opportunity-match">
        <span className="opportunity-match__label">Match unavailable</span>
        {compact ? null : (
          <span className="pf-muted"> Skill match is not available for this opportunity.</span>
        )}
      </p>
    )
  }

  const matched = match.matched || []

  return (
    <div className="opportunity-match">
      <p>
        <strong>{match.percent}% Match</strong>
        {!matched.length ? <span className="pf-muted"> · No matching skills yet</span> : null}
      </p>
      {matched.length ? (
        <p className="opportunity-match__skills">
          <span className="pf-muted">Matched:</span> {matched.join(', ')}
        </p>
      ) : null}
    </div>
  )
}

export default OpportunityMatch
