import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { PATHS } from '../../routes/paths.js'
import { approvalLabel, approvalTone, formatDate } from '../../utils/organization.js'

function OpportunityActions({ opportunity, isOwner, onSubmit, onDelete, submitting }) {
  if (!opportunity) {
    return null
  }

  return (
    <div className="org-actions">
      <Link to={PATHS.organizationOpportunity(opportunity.id)} className="pf-btn pf-btn-secondary">
        View
      </Link>
      {isOwner && opportunity.canEdit ? (
        <Link to={PATHS.organizationOpportunityEdit(opportunity.id)} className="pf-btn pf-btn-secondary">
          Edit
        </Link>
      ) : null}
      {isOwner && opportunity.canSubmit ? (
        <Button onClick={() => onSubmit(opportunity)} disabled={submitting}>
          {opportunity.approvalStatus === 'rejected' ? 'Resubmit' : 'Submit for Review'}
        </Button>
      ) : null}
      {isOwner && opportunity.canDelete ? (
        <Button variant="danger" onClick={() => onDelete(opportunity)} disabled={submitting}>
          Delete
        </Button>
      ) : null}
    </div>
  )
}

function OrganizationOpportunityTable({ opportunities, isOwner, onSubmit, onDelete, submitting }) {
  if (!opportunities.length) {
    return <p className="pf-muted">No opportunities yet.</p>
  }

  return (
    <div className="org-table-wrap">
      <table className="org-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Deadline</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opportunity) => (
            <tr key={opportunity.id}>
              <td>
                <strong>{opportunity.title}</strong>
                {opportunity.approvalStatus === 'rejected' && opportunity.rejectionReason ? (
                  <p className="pf-muted org-reject-reason">{opportunity.rejectionReason}</p>
                ) : null}
              </td>
              <td>{opportunity.type}</td>
              <td>
                <Badge tone={approvalTone(opportunity.approvalStatus)}>
                  {approvalLabel(opportunity.approvalStatus)}
                </Badge>
              </td>
              <td>{formatDate(opportunity.deadline)}</td>
              <td>
                <OpportunityActions
                  opportunity={opportunity}
                  isOwner={isOwner}
                  onSubmit={onSubmit}
                  onDelete={onDelete}
                  submitting={submitting}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OrganizationOpportunityTable
export { OpportunityActions }
