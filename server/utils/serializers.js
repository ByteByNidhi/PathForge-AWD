const { idOf } = require('./ids');

function serializeSkill(skill) {
  if (!skill) {
    return null;
  }

  return {
    id: String(skill._id || skill.id),
    _id: skill._id,
    name: skill.name,
    slug: skill.slug,
    category: skill.category || '',
  };
}

function serializeLearningPath(path, options = {}) {
  if (!path) {
    return null;
  }

  const id = String(path._id || path.id);
  const pathName = path.pathName || path.title;
  const skills = Array.isArray(path.skills)
    ? path.skills
        .filter((item) => item && typeof item === 'object' && item.name)
        .map(serializeSkill)
    : undefined;
  const hasSelected = Object.prototype.hasOwnProperty.call(options, 'selectedPathId');
  return {
    id,
    _id: path._id,
    pathName,
    title: path.title || pathName,
    description: path.description ?? null,
    icon: path.icon ?? null,
    slug: path.slug,
    isPublished: path.isPublished !== false,
    roadmapSource: path.roadmapSource || 'curated',
    roadmapGeneratedAt: options.includeDraftMeta ? path.roadmapGeneratedAt ?? null : undefined,
    roadmapDraftTitle: options.includeDraftMeta ? path.roadmapDraftTitle ?? null : undefined,
    roadmapDraftDescription: options.includeDraftMeta
      ? path.roadmapDraftDescription ?? null
      : undefined,
    roadmapMeta: path.roadmapMeta,
    selected: hasSelected ? idOf(options.selectedPathId) === id : undefined,
    ...(skills ? { skills } : {}),
  };
}

function serializeRoadmapStep(step, { completedIds, currentStepId, unlockedIds } = {}) {
  const id = String(step._id || step.id);
  const completed = Boolean(completedIds && completedIds.has(id));
  const current = Boolean(currentStepId) && id === String(currentStepId) && !completed;
  const skillUnlocked = Boolean(unlockedIds && unlockedIds.has(id)) && !completed && !current;
  const available = current || skillUnlocked;
  const skills = Array.isArray(step.skills)
    ? step.skills
        .filter((item) => item && item.name)
        .map(serializeSkill)
    : [];

  let state = 'locked';
  if (completed) {
    state = 'completed';
  } else if (current) {
    state = 'current';
  } else if (skillUnlocked) {
    state = 'available';
  }

  return {
    id,
    _id: step._id,
    stepNo: step.stepNo,
    title: step.title,
    description: step.description ?? null,
    xpReward: Number(step.xpReward) || 0,
    skills,
    status: completed ? 'completed' : 'not_started',
    state,
    completed,
    current,
    available,
    locked: !completed && !available,
  };
}

module.exports = {
  serializeSkill,
  serializeLearningPath,
  serializeRoadmapStep,
};
