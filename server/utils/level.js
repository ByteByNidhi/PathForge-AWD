function calculateLevel(xp) {
  const value = Number(xp) || 0;
  return Math.max(1, Math.floor(value / 100) + 1);
}

function xpIntoLevel(xp) {
  return (Number(xp) || 0) % 100;
}

function roadmapProgressPercent(completedPublishedSteps, totalPublishedSteps) {
  const total = Number(totalPublishedSteps) || 0;
  if (total <= 0) {
    return 0;
  }
  const completed = Number(completedPublishedSteps) || 0;
  return Math.round((completed / total) * 100);
}

module.exports = {
  calculateLevel,
  xpIntoLevel,
  roadmapProgressPercent,
};
