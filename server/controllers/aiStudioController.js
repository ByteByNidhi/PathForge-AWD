const geminiService = require('../services/geminiService');
const User = require('../models/User');
const UserSkill = require('../models/UserSkill');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function normalizeMessage(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const getStudio = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('learningPath', 'title pathName description');
  const skillRows = await UserSkill.find({ user: user._id }).populate('skill');
  const skillNames = skillRows.map((row) => row.skill?.name).filter(Boolean);

  res.status(200).json({
    success: true,
    context: {
      name: user.name,
      level: user.level || 1,
      xp: user.xp || 0,
      pathName: user.learningPath?.pathName || user.learningPath?.title || null,
      skillNames,
    },
  });
});

const chat = asyncHandler(async (req, res) => {
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'message')) {
    throw new AppError('Please enter a question for the career assistant.', 422, [
      { field: 'message', message: 'The message field is required.' },
    ]);
  }

  const raw = req.body.message;
  if (typeof raw !== 'string') {
    throw new AppError('Please enter a question for the career assistant.', 422, [
      { field: 'message', message: 'The message field must be a string.' },
    ]);
  }

  if (raw.length > 2000) {
    throw new AppError('Please enter a question for the career assistant.', 422, [
      { field: 'message', message: 'The message field must not exceed 2000 characters.' },
    ]);
  }

  const message = normalizeMessage(raw);
  if (!message) {
    throw new AppError('Please enter a question for the career assistant.', 422, [
      { field: 'message', message: 'Please enter a question for the career assistant.' },
    ]);
  }

  const user = await User.findById(req.user.id).select('+aiStudioHistory');
  const history = Array.isArray(user.aiStudioHistory) ? user.aiStudioHistory : [];
  const reply = await geminiService.generateReply(user, message, history);

  history.push({ role: 'user', text: message });
  history.push({ role: 'model', text: reply });
  user.aiStudioHistory = history.slice(-geminiService.MAX_HISTORY);
  await user.save();

  res.status(200).json({
    success: true,
    reply,
  });
});

module.exports = {
  getStudio,
  chat,
};
