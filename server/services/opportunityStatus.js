const STATUS_OPEN = 'open';
const STATUS_CLOSING_SOON = 'closing_soon';
const STATUS_CLOSED = 'closed';
const CLOSING_SOON_DAYS = 14;

function startOfDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function deadlineStatus(deadline, now = new Date()) {
  if (deadline == null || deadline === '') {
    return STATUS_OPEN;
  }

  const today = startOfDay(now);
  const due = startOfDay(deadline);
  if (!today || !due) {
    return STATUS_OPEN;
  }

  if (due < today) {
    return STATUS_CLOSED;
  }

  if (due <= addDays(today, CLOSING_SOON_DAYS)) {
    return STATUS_CLOSING_SOON;
  }

  return STATUS_OPEN;
}

function deadlineStatusLabel(deadline, now = new Date()) {
  const status = deadlineStatus(deadline, now);
  if (status === STATUS_CLOSED) {
    return 'Closed';
  }
  if (status === STATUS_CLOSING_SOON) {
    return 'Closing Soon';
  }
  return 'Open';
}

function isExpired(deadline, now = new Date()) {
  if (deadline == null || deadline === '') {
    return false;
  }
  const today = startOfDay(now);
  const due = startOfDay(deadline);
  if (!today || !due) {
    return false;
  }
  return due < today;
}

module.exports = {
  STATUS_OPEN,
  STATUS_CLOSING_SOON,
  STATUS_CLOSED,
  CLOSING_SOON_DAYS,
  startOfDay,
  addDays,
  deadlineStatus,
  deadlineStatusLabel,
  isExpired,
};
