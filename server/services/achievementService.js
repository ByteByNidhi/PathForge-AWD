const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const UserProgress = require('../models/UserProgress');
const UserSkill = require('../models/UserSkill');
const RoadmapStep = require('../models/RoadmapStep');
const { calculateLevel, roadmapProgressPercent } = require('../utils/level');
const { ACHIEVEMENT_CATALOG } = require('../data/achievements');

const CATALOG_SLUGS = ACHIEVEMENT_CATALOG.map((item) => item.slug);

async function completedStepCount(user) {
  return UserProgress.countDocuments({
    userId: user._id,
    status: 'completed',
  });
}

async function selectedRoadmapPercent(user) {
  const pathId = user.learningPath && (user.learningPath._id || user.learningPath);
  if (!pathId) {
    return 0;
  }

  const published = await RoadmapStep.find({ pathId, isPublished: true }).select('_id');
  const total = published.length;
  if (!total) {
    return 0;
  }

  const completed = await UserProgress.countDocuments({
    userId: user._id,
    status: 'completed',
    roadmapStepId: { $in: published.map((step) => step._id) },
  });

  return roadmapProgressPercent(completed, total);
}

async function skillsCount(user) {
  return UserSkill.countDocuments({ user: user._id });
}

async function currentValue(user, achievement) {
  switch (achievement.conditionType) {
    case 'completed_steps':
      return completedStepCount(user);
    case 'roadmap_percent':
      return selectedRoadmapPercent(user);
    case 'skills_count':
      return skillsCount(user);
    case 'xp':
      return Number(user.xp) || 0;
    case 'level':
      return calculateLevel(user.xp);
    default:
      return 0;
  }
}

async function unlock(user, achievement) {
  try {
    await UserAchievement.create({
      userId: user._id,
      achievementId: achievement._id,
      unlockedAt: new Date(),
    });
    return true;
  } catch (error) {
    if (error && error.code === 11000) {
      return false;
    }
    throw error;
  }
}

async function loadCatalog() {
  const catalog = await Achievement.find({ slug: { $in: CATALOG_SLUGS } });
  const bySlug = new Map(catalog.map((item) => [item.slug, item]));
  return CATALOG_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean);
}

async function checkAndUnlock(user) {
  if (!user) {
    return [];
  }

  const unlocked = [];
  const catalog = await loadCatalog();

  for (const achievement of catalog) {
    const value = await currentValue(user, achievement);
    if (value < Number(achievement.conditionValue)) {
      continue;
    }
    if (await unlock(user, achievement)) {
      unlocked.push(achievement);
    }
  }

  return unlocked;
}

function serializeCatalogItem(achievement, unlock, value) {
  const target = Number(achievement.conditionValue) || 0;
  return {
    id: String(achievement._id),
    slug: achievement.slug,
    name: achievement.name,
    title: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    rarity: achievement.rarity,
    conditionType: achievement.conditionType,
    conditionValue: target,
    unlocked: Boolean(unlock),
    unlockedAt: unlock ? unlock.unlockedAt : null,
    current: value,
    target,
  };
}

async function catalogFor(user) {
  const [catalog, unlocks] = await Promise.all([
    loadCatalog(),
    UserAchievement.find({ userId: user._id }),
  ]);

  const unlockMap = new Map(unlocks.map((item) => [String(item.achievementId), item]));

  const items = [];
  for (const achievement of catalog) {
    const value = await currentValue(user, achievement);
    items.push(serializeCatalogItem(achievement, unlockMap.get(String(achievement._id)), value));
  }

  return items;
}

module.exports = {
  checkAndUnlock,
  catalogFor,
  currentValue,
  unlock,
};
