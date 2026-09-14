const mongoose = require('mongoose');
const LearningPath = require('../models/LearningPath');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function publishedFilter(user) {
  if (user && user.role === 'admin') {
    return {};
  }
  return { isPublished: true };
}

const listLearningPaths = asyncHandler(async (req, res) => {
  const paths = await LearningPath.find(publishedFilter(req.user))
    .select('title description slug isPublished skills roadmapMeta')
    .sort({ title: 1 });

  res.status(200).json({ success: true, learningPaths: paths });
});

const getLearningPath = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Learning path not found', 404);
  }

  const path = await LearningPath.findOne({
    _id: id,
    ...publishedFilter(req.user),
  }).populate('skills');

  if (!path) {
    throw new AppError('Learning path not found', 404);
  }

  res.status(200).json({ success: true, learningPath: path });
});

const getLearningPathSkills = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Learning path not found', 404);
  }

  const path = await LearningPath.findOne({
    _id: id,
    ...publishedFilter(req.user),
  }).populate('skills');

  if (!path) {
    throw new AppError('Learning path not found', 404);
  }

  res.status(200).json({ success: true, skills: path.skills });
});

module.exports = {
  listLearningPaths,
  getLearningPath,
  getLearningPathSkills,
};
