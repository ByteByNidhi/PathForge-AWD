function calculateLevel(xp) {
  const value = Number(xp) || 0;
  return Math.max(1, Math.floor(value / 100) + 1);
}

module.exports = {
  calculateLevel,
};
