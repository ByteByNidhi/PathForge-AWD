const User = require('../models/User');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const UserProgress = require('../models/UserProgress');
const UserSkill = require('../models/UserSkill');
const AppError = require('../utils/AppError');
const { idsEqual } = require('../utils/ids');
const { calculateLevel, xpIntoLevel, roadmapProgressPercent } = require('../utils/level');
const {
  serializeLearningPath,
  serializeRoadmapStep,
} = require('../utils/serializers');
const achievementService = require('./achievementService');

const STEP_SORT = RoadmapStep.STEP_SORT;

async function getPublishedSteps(pathId) {
  return RoadmapStep.find({ pathId, isPublished: true }).sort(STEP_SORT).populate('skills');
}

async function getDraftSteps(pathId) {
  return RoadmapStep.find({ pathId, isPublished: false }).sort(STEP_SORT).populate('skills');
}

async function getAllSteps(pathId) {
  return RoadmapStep.find({ pathId }).sort(STEP_SORT).populate('skills');
}

async function completedPublishedStepIds(userId, pathId) {
  const published = await RoadmapStep.find({ pathId, isPublished: true }).select('_id');
  const stepIds = published.map((step) => step._id);

  if (!stepIds.length) {
    return new Set();
  }

  const records = await UserProgress.find({
    userId,
    roadmapStepId: { $in: stepIds },
    status: 'completed',
  }).select('roadmapStepId');

  return new Set(records.map((record) => String(record.roadmapStepId)));
}

async function availableRoadmapStep(user, path) {
  if (!user || !path) {
    return null;
  }

  const completedIds = await completedPublishedStepIds(user._id, path._id);
  const steps = await RoadmapStep.find({ pathId: path._id, isPublished: true }).sort(STEP_SORT);

  return steps.find((step) => !completedIds.has(String(step._id))) || null;
}

async function knownSkillIdSet(userId) {
  const records = await UserSkill.find({ user: userId }).select('skill');
  return new Set(records.map((record) => String(record.skill)));
}

async function skillUnlockedPublishedStepIds(user, path, completedIds) {
  const unlocked = new Set();
  if (!user || !path) {
    return unlocked;
  }

  const knownSkillIds = await knownSkillIdSet(user._id);
  if (!knownSkillIds.size) {
    return unlocked;
  }

  const steps = await getPublishedSteps(path._id);
  for (const step of steps) {
    const id = String(step._id);
    if (completedIds.has(id)) {
      continue;
    }
    if (stepMatchesKnownSkills(step, knownSkillIds)) {
      unlocked.add(id);
    }
  }

  return unlocked;
}

async function canCompleteRoadmapStep(user, step) {
  if (!user || !step || !idsEqual(user.learningPath, step.pathId) || step.isPublished !== true) {
    return false;
  }

  const path = await LearningPath.findById(step.pathId);
  const sequential = await availableRoadmapStep(user, path);
  if (sequential && idsEqual(sequential._id, step._id)) {
    return true;
  }

  const completedIds = await completedPublishedStepIds(user._id, path._id);
  if (completedIds.has(String(step._id))) {
    return true;
  }

  const populated = await RoadmapStep.findById(step._id).populate('skills');
  const knownSkillIds = await knownSkillIdSet(user._id);
  return stepMatchesKnownSkills(populated, knownSkillIds);
}

function userProgressPayload(user, stats) {
  const totalXp = Number(user.xp) || 0;
  return {
    completedSteps: stats.completedSteps,
    totalPublishedSteps: stats.totalPublishedSteps,
    progressPercent: stats.progressPercent,
    currentStepId: stats.currentStepId,
    totalXp,
    level: calculateLevel(totalXp),
    xpIntoLevel: xpIntoLevel(totalXp),
  };
}

async function buildRoadmapPayload(user, path) {
  const isSelected = idsEqual(user.learningPath, path._id);
  const steps = await getPublishedSteps(path._id);
  const completedIds = await completedPublishedStepIds(user._id, path._id);
  const available = isSelected ? await availableRoadmapStep(user, path) : null;
  const currentStepId = available ? String(available._id) : null;
  const completedSteps = completedIds.size;
  const totalPublishedSteps = steps.length;
  const progressPercent = roadmapProgressPercent(completedSteps, totalPublishedSteps);

  const skillUnlockedIds = isSelected
    ? await skillUnlockedPublishedStepIds(user, path, completedIds)
    : new Set();
  const serializedSteps = steps.map((step) =>
    serializeRoadmapStep(step, {
      completedIds,
      currentStepId,
      unlockedIds: skillUnlockedIds,
    })
  );

  const stats = {
    completedSteps,
    totalPublishedSteps,
    progressPercent,
    currentStepId,
  };

  return {
    learningPath: serializeLearningPath(path, { selectedPathId: user.learningPath }),
    selected: isSelected,
    steps: serializedSteps,
    ...userProgressPayload(user, stats),
  };
}

async function selectLearningPath(user, path) {
  await User.findByIdAndUpdate(user._id, { learningPath: path._id });
  const updated = await User.findById(user._id).populate(
    'learningPath',
    'title pathName slug description icon'
  );
  return updated;
}

async function completeRoadmapStep(user, path, step) {
  if (!idsEqual(step.pathId, path._id) || step.isPublished !== true) {
    throw new AppError('Roadmap step not found', 404);
  }

  if (!idsEqual(user.learningPath, path._id)) {
    throw new AppError('You can only complete steps on your selected career path.', 403);
  }

  let progress = await UserProgress.findOne({
    userId: user._id,
    roadmapStepId: step._id,
  });

  const alreadyCompleted = Boolean(progress) && progress.status === 'completed';

  if (!alreadyCompleted) {
    const allowed = await canCompleteRoadmapStep(user, step);
    if (!allowed) {
      throw new AppError('Complete your current roadmap step first.', 403);
    }
  }

  if (!progress) {
    progress = new UserProgress({
      userId: user._id,
      roadmapStepId: step._id,
    });
  }

  const originalCompletedAt = progress.completedAt;
  progress.status = 'completed';
  progress.completedAt = originalCompletedAt || new Date();
  await progress.save();

  if (!alreadyCompleted) {
    await user.addXp(Number(step.xpReward) || 0);
    await achievementService.checkAndUnlock(user);
  }

  const freshUser = await User.findById(user._id);
  const roadmap = await buildRoadmapPayload(freshUser, path);

  return {
    alreadyCompleted,
    message: alreadyCompleted ? 'Step already completed.' : 'Step marked complete.',
    progress: {
      id: String(progress._id),
      userId: String(progress.userId),
      roadmapStepId: String(progress.roadmapStepId),
      status: progress.status,
      completedAt: progress.completedAt,
    },
    user: freshUser.toSafeObject(),
    ...roadmap,
  };
}

function stepSkillIds(step) {
  return (step.skills || [])
    .map((skill) => String(skill && (skill._id || skill)))
    .filter(Boolean);
}

function stepMatchesKnownSkills(step, knownSkillIds) {
  const required = stepSkillIds(step);
  if (!required.length) {
    return false;
  }
  return required.every((id) => knownSkillIds.has(id));
}

async function creditOnboardingSkills(user, path) {
  if (!user || !path) {
    return user;
  }

  const records = await UserSkill.find({ user: user._id }).select('skill');
  const knownSkillIds = new Set(records.map((record) => String(record.skill)));
  if (!knownSkillIds.size) {
    return user;
  }

  const steps = await getPublishedSteps(path._id);
  let currentUser = user;

  for (const step of steps) {
    if (!stepMatchesKnownSkills(step, knownSkillIds)) {
      break;
    }
    const result = await completeRoadmapStep(currentUser, path, step);
    currentUser = await User.findById(currentUser._id);
    if (result.alreadyCompleted) {
      continue;
    }
  }

  return currentUser;
}

async function buildProgressionSummary(user) {
  const totalXp = Number(user.xp) || 0;
  const empty = {
    learningPath: null,
    selected: false,
    completedSteps: 0,
    totalPublishedSteps: 0,
    progressPercent: 0,
    currentStepId: null,
    currentStep: null,
    roadmapCompleted: false,
    totalXp,
    level: calculateLevel(totalXp),
    xpIntoLevel: xpIntoLevel(totalXp),
  };

  const pathRef = user.learningPath;
  if (!pathRef) {
    return empty;
  }

  const path = pathRef.pathName ? pathRef : await LearningPath.findById(pathRef);
  if (!path) {
    return empty;
  }

  const roadmap = await buildRoadmapPayload(user, path);
  const currentStep =
    roadmap.steps.find((step) => step.id === String(roadmap.currentStepId || '')) || null;
  const roadmapCompleted =
    roadmap.totalPublishedSteps > 0 && roadmap.completedSteps === roadmap.totalPublishedSteps;

  return {
    learningPath: roadmap.learningPath,
    selected: roadmap.selected,
    completedSteps: roadmap.completedSteps,
    totalPublishedSteps: roadmap.totalPublishedSteps,
    progressPercent: roadmap.progressPercent,
    currentStepId: roadmap.currentStepId,
    currentStep,
    roadmapCompleted,
    totalXp: roadmap.totalXp,
    level: roadmap.level,
    xpIntoLevel: roadmap.xpIntoLevel,
  };
}

module.exports = {
  STEP_SORT,
  getPublishedSteps,
  getDraftSteps,
  getAllSteps,
  completedPublishedStepIds,
  availableRoadmapStep,
  skillUnlockedPublishedStepIds,
  canCompleteRoadmapStep,
  buildRoadmapPayload,
  buildProgressionSummary,
  selectLearningPath,
  completeRoadmapStep,
  creditOnboardingSkills,
  stepMatchesKnownSkills,
};
