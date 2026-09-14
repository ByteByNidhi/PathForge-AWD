const mongoose = require('mongoose');
const User = require('../models/User');
const LearningPath = require('../models/LearningPath');
const CareerPathRequest = require('../models/CareerPathRequest');
const UserSkill = require('../models/UserSkill');
const { assignCatalogueSkills } = require('./skillController');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getOnboarding = asyncHandler(async (req, res) => {
  const learningPaths = await LearningPath.find({ isPublished: true }).sort({ title: 1 });

  res.status(200).json({
    success: true,
    onboardingCompleted: req.user.onboardingCompleted,
    learningPaths,
  });
});

const completeOnboarding = asyncHandler(async (req, res) => {
  if (req.user.onboardingCompleted) {
    throw new AppError('Onboarding is already complete', 400);
  }

  const isOther = Boolean(req.body.isOther);
  const isBeginner = Boolean(req.body.isBeginner);
  const skillIds = Array.isArray(req.body.skillIds) ? req.body.skillIds : [];
  const requestedPath = String(req.body.requestedPath || '').trim();
  const learningPathId = req.body.learningPathId;

  let learningPath = null;
  let careerPathRequest = null;

  if (!isOther) {
    if (!learningPathId || !mongoose.Types.ObjectId.isValid(learningPathId)) {
      throw new AppError('Select a career path', 400, [
        { field: 'learningPathId', message: 'Select a career path' },
      ]);
    }

    const path = await LearningPath.findOne({
      _id: learningPathId,
      isPublished: true,
    });

    if (!path) {
      throw new AppError('Select a published career path', 400, [
        { field: 'learningPathId', message: 'Select a published career path' },
      ]);
    }

    learningPath = path._id;
  } else {
    if (requestedPath.length < 2 || requestedPath.length > 120) {
      throw new AppError('Enter the career path you want reviewed', 400, [
        { field: 'requestedPath', message: 'Enter the career path you want reviewed' },
      ]);
    }

    const request = await CareerPathRequest.create({
      user: req.user.id,
      requestedPath,
      status: 'pending',
    });
    careerPathRequest = request._id;
  }

  if (isBeginner) {
    await UserSkill.deleteMany({ user: req.user.id });
  } else if (skillIds.length) {
    await assignCatalogueSkills(req.user.id, skillIds);
  }

  await User.findByIdAndUpdate(req.user.id, {
    isBeginner,
    onboardingCompleted: true,
    learningPath,
    careerPathRequest,
  });

  const user = await User.findById(req.user.id)
    .populate('learningPath', 'title slug description')
    .populate('careerPathRequest', 'requestedPath status');

  const skills = await UserSkill.find({ user: req.user.id }).populate('skill');

  res.status(200).json({
    success: true,
    message: 'Onboarding complete',
    user: user.toSafeObject(),
    skills: skills.map((item) => item.skill),
  });
});

module.exports = {
  getOnboarding,
  completeOnboarding,
};
