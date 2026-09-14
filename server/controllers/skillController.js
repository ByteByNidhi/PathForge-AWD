const mongoose = require('mongoose');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const LearningPath = require('../models/LearningPath');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const listSkills = asyncHandler(async (_req, res) => {
  const skills = await Skill.find().sort({ name: 1 });
  res.status(200).json({ success: true, skills });
});

const listRelevantSkills = asyncHandler(async (req, res) => {
  const { learningPathId } = req.query;

  if (!learningPathId || !mongoose.Types.ObjectId.isValid(learningPathId)) {
    throw new AppError('A valid learning path is required', 400, [
      { field: 'learningPathId', message: 'A valid learning path is required' },
    ]);
  }

  const path = await LearningPath.findOne({
    _id: learningPathId,
    isPublished: true,
  }).populate('skills');

  if (!path) {
    throw new AppError('Learning path not found', 404);
  }

  res.status(200).json({ success: true, skills: path.skills });
});

const listMySkills = asyncHandler(async (req, res) => {
  const records = await UserSkill.find({ user: req.user.id }).populate('skill');
  res.status(200).json({
    success: true,
    skills: records.map((record) => record.skill),
  });
});

async function assignCatalogueSkills(userId, skillIds) {
  const uniqueIds = [...new Set((skillIds || []).map(String))];

  if (!uniqueIds.length) {
    return [];
  }

  if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError('One or more skills are invalid', 400, [
      { field: 'skillIds', message: 'One or more skills are invalid' },
    ]);
  }

  const skills = await Skill.find({ _id: { $in: uniqueIds } });
  if (skills.length !== uniqueIds.length) {
    throw new AppError('Skills must be selected from the catalogue', 400, [
      { field: 'skillIds', message: 'Skills must be selected from the catalogue' },
    ]);
  }

  await UserSkill.bulkWrite(
    uniqueIds.map((skillId) => ({
      updateOne: {
        filter: { user: userId, skill: skillId },
        update: { $setOnInsert: { user: userId, skill: skillId } },
        upsert: true,
      },
    }))
  );

  const records = await UserSkill.find({ user: userId, skill: { $in: uniqueIds } }).populate(
    'skill'
  );
  return records.map((record) => record.skill);
}

const assignMySkills = asyncHandler(async (req, res) => {
  const skillIds = req.body.skillIds || (req.body.skillId ? [req.body.skillId] : []);
  const skills = await assignCatalogueSkills(req.user.id, skillIds);

  res.status(200).json({
    success: true,
    message: 'Skills updated',
    skills,
  });
});

const removeMySkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(skillId)) {
    throw new AppError('Invalid skill', 400);
  }

  const removed = await UserSkill.findOneAndDelete({
    user: req.user.id,
    skill: skillId,
  });

  if (!removed) {
    throw new AppError('Skill not found on your profile', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Skill removed',
  });
});

module.exports = {
  listSkills,
  listRelevantSkills,
  listMySkills,
  assignMySkills,
  removeMySkill,
  assignCatalogueSkills,
};
