function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function all() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    {
      id: 'demo-sub-1',
      user: 'Aisha Rahman',
      email: 'aisha.demo@pathforge.test',
      plan: 'Pro',
      amount: 499,
      currency: 'INR',
      startDate: formatDate(addMonths(today, -4)),
      renewsOn: formatDate(addDays(today, 18)),
      status: 'Active',
      paymentMethod: 'Demo / Not Connected',
      history: [
        { date: formatDate(addMonths(today, -1)), amount: 499, status: 'Paid (demo)' },
        { date: formatDate(addMonths(today, -2)), amount: 499, status: 'Paid (demo)' },
        { date: formatDate(addMonths(today, -3)), amount: 499, status: 'Paid (demo)' },
      ],
    },
    {
      id: 'demo-sub-2',
      user: 'Rohan Mehta',
      email: 'rohan.demo@pathforge.test',
      plan: 'Premium',
      amount: 899,
      currency: 'INR',
      startDate: formatDate(addMonths(today, -8)),
      renewsOn: formatDate(addDays(today, 6)),
      status: 'Expiring Soon',
      paymentMethod: 'Demo / Not Connected',
      history: [
        { date: formatDate(addDays(today, -24)), amount: 899, status: 'Paid (demo)' },
        { date: formatDate(addMonths(today, -2)), amount: 899, status: 'Paid (demo)' },
      ],
    },
    {
      id: 'demo-sub-3',
      user: 'Priya Nair',
      email: 'priya.demo@pathforge.test',
      plan: 'Pro',
      amount: 499,
      currency: 'INR',
      startDate: formatDate(addYears(today, -1)),
      renewsOn: formatDate(addDays(today, -12)),
      status: 'Expired',
      paymentMethod: 'Demo / Not Connected',
      history: [
        { date: formatDate(addMonths(today, -13)), amount: 499, status: 'Paid (demo)' },
        { date: formatDate(addDays(today, -12)), amount: 499, status: 'Failed (demo)' },
      ],
    },
    {
      id: 'demo-sub-4',
      user: 'Dev Patel',
      email: 'dev.demo@pathforge.test',
      plan: 'Premium',
      amount: 899,
      currency: 'INR',
      startDate: formatDate(addDays(today, -20)),
      renewsOn: formatDate(addMonths(today, 1)),
      status: 'Active',
      paymentMethod: 'Demo / Not Connected',
      history: [{ date: formatDate(addDays(today, -20)), amount: 899, status: 'Paid (demo)' }],
    },
  ];
}

function find(id) {
  return all().find((row) => row.id === String(id)) || null;
}

function summary() {
  const rows = all();
  const active = rows.filter((row) => row.status === 'Active' || row.status === 'Expiring Soon')
    .length;
  const expiring = rows.filter((row) => row.status === 'Expiring Soon').length;
  const revenue = rows
    .flatMap((row) => row.history)
    .filter((row) => row.status === 'Paid (demo)')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    total: rows.length,
    active,
    expiring,
    revenue,
  };
}

module.exports = {
  all,
  find,
  summary,
};
