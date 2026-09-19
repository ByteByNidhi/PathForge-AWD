const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../utils/ids');
const { serializeLearningPath } = require('../utils/serializers');
const progressionService = require('../services/progressionService');

async function findLearningPathOr404(id, { publishedOnly = false } = {}) {
  if (!isValidId(id)) {
    throw new AppError('Learning path not found', 404);
  }

  const query = { _id: id };
  if (publishedOnly) {
    query.isPublished = true;
  }

  const path = await LearningPath.findOne(query).populate('skills');
  if (!path) {
    throw new AppError('Learning path not found', 404);
  }
  return path;
}

const listLearningPaths = asyncHandler(async (req, res) => {
  const paths = await LearningPath.find({ isPublished: true })
    .select(
      'title pathName description icon slug isPublished skills roadmapMeta roadmapSource'
    )
    .sort({ pathName: 1, title: 1 });

  res.status(200).json({
    success: true,
    learningPaths: paths.map((path) =>
      serializeLearningPath(path, { selectedPathId: req.user.learningPath })
    ),
  });
});

const getLearningPath = asyncHandler(async (req, res) => {
  const path = await findLearningPathOr404(req.params.id, { publishedOnly: true });

  res.status(200).json({
    success: true,
    learningPath: serializeLearningPath(path, { selectedPathId: req.user.learningPath }),
  });
});

const getLearningPathSkills = asyncHandler(async (req, res) => {
  const path = await findLearningPathOr404(req.params.id, { publishedOnly: true });

  res.status(200).json({ success: true, skills: path.skills });
});

const selectLearningPath = asyncHandler(async (req, res) => {
  const path = await findLearningPathOr404(req.params.id, { publishedOnly: true });
  const user = await progressionService.selectLearningPath(req.user, path);

  res.status(200).json({
    success: true,
    message: 'Roadmap selected.',
    user: user.toSafeObject(),
    learningPath: serializeLearningPath(path, { selectedPathId: path._id }),
  });
});

const getLearningPathRoadmap = asyncHandler(async (req, res) => {
  const path = await findLearningPathOr404(req.params.id, { publishedOnly: true });
  const payload = await progressionService.buildRoadmapPayload(req.user, path);

  res.status(200).json({
    success: true,
    ...payload,
  });
});

const completeLearningPathStep = asyncHandler(async (req, res) => {
  const { pathId, stepId } = req.params;

  if (!isValidId(pathId) || !isValidId(stepId)) {
    throw new AppError('Roadmap step not found', 404);
  }

  const path = await LearningPath.findOne({ _id: pathId, isPublished: true });
  if (!path) {
    throw new AppError('Learning path not found', 404);
  }

  const step = await RoadmapStep.findById(stepId);
  if (!step) {
    throw new AppError('Roadmap step not found', 404);
  }

  const result = await progressionService.completeRoadmapStep(req.user, path, step);

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  listLearningPaths,
  getLearningPath,
  getLearningPathSkills,
  selectLearningPath,
  getLearningPathRoadmap,
  completeLearningPathStep,
};
