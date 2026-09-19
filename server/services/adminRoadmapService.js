const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const UserProgress = require('../models/UserProgress');
const AppError = require('../utils/AppError');
const { isValidId } = require('../utils/ids');
const { slugify, escapeRegex } = require('../utils/slugify');
const { serializeLearningPath, serializeSkill } = require('../utils/serializers');
const roadmapGenerationService = require('./roadmapGenerationService');

const PATH_NAME_MAX = 80;
const PATH_DESCRIPTION_MAX = 5000;
const PATH_ICON_MAX = 32;
const STEP_DESCRIPTION_MAX = 2000;

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
  const descriptionRaw = body.description;
  const description =
    descriptionRaw == null ? undefined : String(descriptionRaw).trim() || null;

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

  if (description && description.length > STEP_DESCRIPTION_MAX) {
    errors.push({
      field: 'description',
      message: `The description field must not exceed ${STEP_DESCRIPTION_MAX} characters.`,
    });
  }

  if (xpResult.error) {
    errors.push(xpResult.error);
  } else if (xpResult.value < 0) {
    errors.push({ field: 'xpReward', message: 'The xpReward field must be at least 0.' });
  }

  if (errors.length) {
    throw new AppError(errors[0].message, 422, errors);
  }

  const payload = {
    stepNo: stepNoResult.value,
    title,
    xpReward: xpResult.value,
  };
  if (description !== undefined) {
    payload.description = description;
  }
  return payload;
}

async function parseStepSkillIds(body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'skillIds') && !Object.prototype.hasOwnProperty.call(body, 'skills')) {
    return undefined;
  }

  const raw = body.skillIds ?? body.skills ?? [];
  if (!Array.isArray(raw)) {
    throw new AppError('The skillIds field must be an array.', 422, [
      { field: 'skillIds', message: 'The skillIds field must be an array.' },
    ]);
  }

  const uniqueIds = [...new Set(raw.map((value) => String(value || '')).filter(Boolean))];
  if (uniqueIds.some((id) => !isValidId(id))) {
    throw new AppError('One or more skills are invalid', 422, [
      { field: 'skillIds', message: 'One or more skills are invalid' },
    ]);
  }

  if (!uniqueIds.length) {
    return [];
  }

  const skills = await Skill.find({ _id: { $in: uniqueIds } });
  if (skills.length !== uniqueIds.length) {
    throw new AppError('Skills must be selected from the catalogue', 422, [
      { field: 'skillIds', message: 'Skills must be selected from the catalogue' },
    ]);
  }

  return uniqueIds;
}

async function uniquePathSlug(name) {
  const base = slugify(name) || 'path';
  let slug = base;
  let suffix = 2;
  while (await LearningPath.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function validatedPath(body) {
  const errors = [];
  const pathName = String(body.pathName || body.title || '').trim();
  const description = String(body.description || '').trim();
  const icon = String(body.icon || '').trim();

  if (!pathName) {
    errors.push({ field: 'pathName', message: 'The path name is required.' });
  } else if (pathName.length < 2) {
    errors.push({ field: 'pathName', message: 'The path name must be at least 2 characters.' });
  } else if (pathName.length > PATH_NAME_MAX) {
    errors.push({
      field: 'pathName',
      message: `The path name must not exceed ${PATH_NAME_MAX} characters.`,
    });
  }

  if (description.length > PATH_DESCRIPTION_MAX) {
    errors.push({
      field: 'description',
      message: `The description must not exceed ${PATH_DESCRIPTION_MAX} characters.`,
    });
  }

  if (icon.length > PATH_ICON_MAX) {
    errors.push({
      field: 'icon',
      message: `The icon must not exceed ${PATH_ICON_MAX} characters.`,
    });
  }

  if (errors.length) {
    throw new AppError(errors[0].message, 422, errors);
  }

  return {
    pathName,
    title: pathName,
    description: description || null,
    icon: icon || null,
  };
}

async function assertUniquePathName(pathName, excludeId = null) {
  const query = {
    pathName: new RegExp(`^${escapeRegex(pathName)}$`, 'i'),
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await LearningPath.findOne(query);
  if (existing) {
    throw new AppError('A learning path with this name already exists.', 422, [
      { field: 'pathName', message: 'A learning path with this name already exists.' },
    ]);
  }
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

async function create(body = {}) {
  const validated = validatedPath(body);
  await assertUniquePathName(validated.pathName);

  const path = await LearningPath.create({
    title: validated.title,
    pathName: validated.pathName,
    description: validated.description,
    icon: validated.icon,
    slug: await uniquePathSlug(validated.pathName),
    isPublished: false,
    roadmapSource: LearningPath.SOURCE_CURATED,
    roadmapMeta: {
      hasPublishedRoadmap: false,
      stepCount: 0,
    },
  });

  return {
    message: 'Learning path created as a draft. Add steps or generate an AI draft, then publish it.',
    learningPath: serializeAdminPath(await path.populate('skills'), {
      publishedStepCount: 0,
      draftStepCount: 0,
    }),
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

async function publishUnpublishedSteps(path) {
  const drafts = await RoadmapStep.find({ pathId: path._id, isPublished: false }).sort(
    RoadmapStep.STEP_SORT
  );
  if (!drafts.length) {
    return path;
  }

  if (await path.hasLiveStudentProgress()) {
    throw new AppError(
      'This career path already has user progress. Publishing would replace the live roadmap and is blocked. Existing progress has not been changed.',
      409
    );
  }

  const published = await RoadmapStep.find({ pathId: path._id, isPublished: true });
  const publishedIds = published.map((step) => step._id);
  if (publishedIds.length) {
    await UserProgress.deleteMany({ roadmapStepId: { $in: publishedIds } });
    await RoadmapStep.deleteMany({ _id: { $in: publishedIds } });
  }

  for (const step of drafts) {
    step.isPublished = true;
    await step.save();
  }

  path.roadmapSource = LearningPath.SOURCE_CURATED;
  path.roadmapMeta = {
    hasPublishedRoadmap: true,
    stepCount: drafts.length,
  };
  await path.save();
  return path;
}

async function publish(id) {
  const path = await findPathOr404(id);
  const draftCount = await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false });
  const publishedCount = await RoadmapStep.countDocuments({ pathId: path._id, isPublished: true });
  const isAiDraft = Boolean(path.roadmapDraftTitle || path.roadmapGeneratedAt);

  if (draftCount) {
    if (isAiDraft) {
      await roadmapGenerationService.publishDraft(path);
    } else {
      await publishUnpublishedSteps(path);
    }
  } else if (!publishedCount) {
    throw new AppError('Add or generate roadmap steps before publishing this path.', 422, [
      { field: 'steps', message: 'Add or generate roadmap steps before publishing this path.' },
    ]);
  } else if (path.isPublished) {
    throw new AppError('There is no AI draft to publish. Generate a roadmap first.', 422);
  }

  const fresh = await LearningPath.findById(path._id);
  fresh.isPublished = true;
  await fresh.save();
  return show(id);
}

async function storeStep(id, body) {
  const path = await findPathOr404(id);
  const validated = validatedStep(body);
  const skillIds = await parseStepSkillIds(body);
  const step = await RoadmapStep.create({
    pathId: path._id,
    stepNo: validated.stepNo,
    title: validated.title,
    description: validated.description ?? null,
    xpReward: validated.xpReward,
    isPublished: path.isPublished === true,
    skills: skillIds || [],
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
  const skillIds = await parseStepSkillIds(body);
  if (skillIds !== undefined) {
    step.skills = skillIds;
  }
  await step.save();
  return {
    message: 'Roadmap step updated.',
    step: serializeAdminStep(await step.populate('skills')),
  };
}

async function moveStep(pathId, stepId, body = {}) {
  const path = await findPathOr404(pathId);
  const step = await findStepOnPath(path, stepId);
  const direction = String(body.direction || '').toLowerCase();
  if (direction !== 'up' && direction !== 'down') {
    throw new AppError('The direction field must be up or down.', 422, [
      { field: 'direction', message: 'The direction field must be up or down.' },
    ]);
  }

  const siblings = await RoadmapStep.find({
    pathId: path._id,
    isPublished: step.isPublished,
  }).sort(RoadmapStep.STEP_SORT);

  const index = siblings.findIndex((item) => String(item._id) === String(step._id));
  const target = siblings[direction === 'up' ? index - 1 : index + 1];
  if (!target) {
    return {
      message: 'Step order unchanged.',
      step: serializeAdminStep(await step.populate('skills')),
    };
  }

  const originalNo = step.stepNo;
  const otherNo = target.stepNo;
  const temp = Math.max(...siblings.map((item) => Number(item.stepNo) || 0), 0) + 1000;
  step.stepNo = temp;
  await step.save();
  target.stepNo = originalNo;
  await target.save();
  step.stepNo = otherNo;
  await step.save();

  return {
    message: 'Step order updated.',
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
  create,
  generate,
  preview,
  publish,
  storeStep,
  updateStep,
  moveStep,
  destroyStep,
  serializeAdminStep,
};
