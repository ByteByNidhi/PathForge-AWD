const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const UserProgress = require('../models/UserProgress');
const AppError = require('../utils/AppError');
const { isValidId } = require('../utils/ids');
const { serializeLearningPath, serializeSkill } = require('../utils/serializers');
const roadmapGenerationService = require('./roadmapGenerationService');

function serializeAdminStep(step) {
  const skills = Array.isArray(step.skills)
    ? step.skills.filter((item) => item && item.name).map(serializeSkill)
    : [];

  return {
    id: String(step._id),
    _id: step._id,
    stepNo: step.stepNo,
    title: step.title,
    description: step.description ?? null,
    xpReward: Number(step.xpReward) || 0,
    isPublished: step.isPublished === true,
    skills,
  };
}

function serializeAdminPath(path, extras = {}) {
  return {
    ...serializeLearningPath(path, { includeDraftMeta: true }),
    publishedStepCount: extras.publishedStepCount ?? path.publishedStepCount ?? 0,
    draftStepCount: extras.draftStepCount ?? path.draftStepCount ?? 0,
    isAiGenerated: path.roadmapSource === LearningPath.SOURCE_AI,
    hasStudentProgress: extras.hasStudentProgress ?? false,
    isBeginnerPath: extras.isBeginnerPath ?? !(path.skills && path.skills.length),
  };
}

async function findPathOr404(id) {
  if (!isValidId(id)) {
    throw new AppError('Learning path not found', 404);
  }
  const path = await LearningPath.findById(id).populate('skills');
  if (!path) {
    throw new AppError('Learning path not found', 404);
  }
  return path;
}

async function findStepOnPath(path, stepId) {
  if (!isValidId(stepId)) {
    throw new AppError('Roadmap step not found', 404);
  }
  const step = await RoadmapStep.findById(stepId).populate('skills');
  if (!step || String(step.pathId) !== String(path._id)) {
    throw new AppError('Roadmap step not found', 404);
  }
  return step;
}

function parseInteger(value, field) {
  if (value === '' || value == null) {
    return { error: { field, message: `The ${field} field is required.` } };
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return { error: { field, message: `The ${field} field must be an integer.` } };
  }
  return { value: number };
}

function validatedStep(body) {
  const errors = [];
  const stepNoResult = parseInteger(body.stepNo ?? body.step_no, 'stepNo');
  const xpResult = parseInteger(body.xpReward ?? body.xp_reward, 'xpReward');
  const title = String(body.title || '').trim();

  if (stepNoResult.error) {
    errors.push(stepNoResult.error);
  } else if (stepNoResult.value < 1) {
    errors.push({ field: 'stepNo', message: 'The stepNo field must be at least 1.' });
  }

  if (!title) {
    errors.push({ field: 'title', message: 'The title field is required.' });
  } else if (title.length > 255) {
    errors.push({ field: 'title', message: 'The title field must not exceed 255 characters.' });
  }

  if (xpResult.error) {
    errors.push(xpResult.error);
  } else if (xpResult.value < 0) {
    errors.push({ field: 'xpReward', message: 'The xpReward field must be at least 0.' });
  }

  if (errors.length) {
    throw new AppError(errors[0].message, 422, errors);
  }

  return {
    stepNo: stepNoResult.value,
    title,
    xpReward: xpResult.value,
  };
}

function beginnerFromBody(body = {}) {
  const value = body.beginner;
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

async function list() {
  const paths = await LearningPath.find().populate('skills').sort({ pathName: 1, title: 1 });
  const results = [];

  for (const path of paths) {
    const [publishedStepCount, draftStepCount] = await Promise.all([
      RoadmapStep.countDocuments({ pathId: path._id, isPublished: true }),
      RoadmapStep.countDocuments({ pathId: path._id, isPublished: false }),
    ]);
    results.push(serializeAdminPath(path, { publishedStepCount, draftStepCount }));
  }

  return { paths: results };
}

async function show(id) {
  const path = await findPathOr404(id);
  const [steps, draftSteps, hasStudentProgress] = await Promise.all([
    RoadmapStep.find({ pathId: path._id, isPublished: true }).sort(RoadmapStep.STEP_SORT).populate('skills'),
    RoadmapStep.find({ pathId: path._id, isPublished: false }).sort(RoadmapStep.STEP_SORT).populate('skills'),
    path.hasLiveStudentProgress(),
  ]);

  return {
    learningPath: serializeAdminPath(path, {
      publishedStepCount: steps.length,
      draftStepCount: draftSteps.length,
      hasStudentProgress,
      isBeginnerPath: !(path.skills && path.skills.length),
    }),
    steps: steps.map(serializeAdminStep),
    draftSteps: draftSteps.map(serializeAdminStep),
    hasStudentProgress,
    isBeginnerPath: !(path.skills && path.skills.length),
  };
}

async function generate(id, body = {}) {
  const path = await findPathOr404(id);
  await roadmapGenerationService.generateDraft(path, beginnerFromBody(body));
  return preview(id);
}

async function preview(id) {
  const path = await findPathOr404(id);
  const draftSteps = await RoadmapStep.find({ pathId: path._id, isPublished: false })
    .sort(RoadmapStep.STEP_SORT)
    .populate('skills');

  if (!draftSteps.length) {
    throw new AppError('There is no AI draft to preview. Generate a roadmap first.', 404);
  }

  const hasStudentProgress = await path.hasLiveStudentProgress();
  return {
    learningPath: serializeAdminPath(path, {
      draftStepCount: draftSteps.length,
      hasStudentProgress,
    }),
    draftSteps: draftSteps.map(serializeAdminStep),
    hasStudentProgress,
  };
}

async function publish(id) {
  const path = await findPathOr404(id);
  await roadmapGenerationService.publishDraft(path);
  return show(id);
}

async function storeStep(id, body) {
  const path = await findPathOr404(id);
  const validated = validatedStep(body);
  const step = await RoadmapStep.create({
    pathId: path._id,
    stepNo: validated.stepNo,
    title: validated.title,
    xpReward: validated.xpReward,
    isPublished: true,
  });
  return {
    message: 'Roadmap step added.',
    step: serializeAdminStep(await step.populate('skills')),
  };
}

async function updateStep(pathId, stepId, body) {
  const path = await findPathOr404(pathId);
  const step = await findStepOnPath(path, stepId);
  Object.assign(step, validatedStep(body));
  await step.save();
  return {
    message: 'Roadmap step updated.',
    step: serializeAdminStep(await step.populate('skills')),
  };
}

async function destroyStep(pathId, stepId) {
  const path = await findPathOr404(pathId);
  const step = await findStepOnPath(path, stepId);
  await UserProgress.deleteMany({ roadmapStepId: step._id });
  await step.deleteOne();
  return { message: 'Roadmap step deleted.' };
}

module.exports = {
  list,
  show,
  generate,
  preview,
  publish,
  storeStep,
  updateStep,
  destroyStep,
  serializeAdminStep,
};
