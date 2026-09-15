const asyncHandler = require('../utils/asyncHandler');
const achievementService = require('../services/achievementService');

const listAchievements = asyncHandler(async (req, res) => {
  const achievements = await achievementService.catalogFor(req.user);

  res.status(200).json({
    success: true,
    achievements,
    unlocked: achievements.filter((item) => item.unlocked),
    locked: achievements.filter((item) => !item.unlocked),
  });
});

module.exports = {
  listAchievements,
};
