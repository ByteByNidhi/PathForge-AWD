import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import { PATHS } from '../../routes/paths.js'
import {
  deadlineTone,
  formatDeadline,
  opportunityId,
} from '../../utils/opportunity.js'
import OpportunityMatch from './OpportunityMatch.jsx'

function OpportunityCard({ opportunity, pending, onToggleSave }) {
  const id = opportunityId(opportunity)
  const saving = pending === id

  return (
    <Card as="article" className={`opportunity-card ${opportunity.saved ? 'is-saved' : ''}`.trim()}>
      <div className="opportunity-card__top">
        <div>
          <h2>
            <Link to={PATHS.opportunityDetail(id)}>{opportunity.title}</Link>
          </h2>
          <p className="opportunity-card__meta pf-muted">
            {opportunity.type}
            {' · '}
            {opportunity.organization}
            {opportunity.location ? ` · ${opportunity.location}` : ''}
            {' · Deadline: '}
            {formatDeadline(opportunity.deadline)}
            {opportunity.sourceLabel && opportunity.sourceLabel !== 'PathForge'
              ? ` · Source: ${opportunity.sourceLabel}`
              : ''}
          </p>
        </div>
        <Badge tone={deadlineTone(opportunity.deadlineStatus)}>
          {opportunity.deadlineStatusLabel || 'Open'}
        </Badge>
      </div>

      <OpportunityMatch opportunity={opportunity} compact />

      <div className="opportunity-card__actions">
        <Link to={PATHS.opportunityDetail(id)} className="pf-btn pf-btn-secondary">
          View details
        </Link>
        <Button
          variant="ghost"
          className={opportunity.saved ? 'opportunity-card__save is-on' : 'opportunity-card__save'}
          onClick={() => onToggleSave(opportunity)}
          disabled={saving}
          aria-pressed={Boolean(opportunity.saved)}
        >
          {opportunity.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {opportunity.saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  )
}

export default OpportunityCard
