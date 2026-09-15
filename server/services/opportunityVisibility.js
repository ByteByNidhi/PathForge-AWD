const Opportunity = require('../models/Opportunity');
const { isExpired } = require('./opportunityStatus');

function hasSource(opportunity) {
  const source = opportunity && opportunity.source;
  return Boolean(source && String(source).trim());
}

function isApproved(opportunity) {
  const status = opportunity && opportunity.approvalStatus;
  return !status || status === Opportunity.APPROVAL_APPROVED;
}

function isVisibleToStudents(opportunity, now = new Date()) {
  if (!opportunity || !isApproved(opportunity)) {
    return false;
  }
  if (hasSource(opportunity) && isExpired(opportunity.deadline, now)) {
    return false;
  }
  return true;
}

function visibleToStudentsFilter(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    $and: [
      {
        $or: [
          { approvalStatus: Opportunity.APPROVAL_APPROVED },
          { approvalStatus: { $exists: false } },
          { approvalStatus: null },
        ],
      },
      {
        $or: [
          { source: { $in: [null, ''] } },
          { source: { $exists: false } },
          {
            $and: [
              { source: { $nin: [null, ''] } },
              {
                $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: today } }],
              },
            ],
          },
        ],
      },
    ],
  };
}

module.exports = {
  hasSource,
  isApproved,
  isVisibleToStudents,
  visibleToStudentsFilter,
};
