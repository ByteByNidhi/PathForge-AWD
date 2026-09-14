const User = require('../models/User');
const UserSkill = require('../models/UserSkill');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  normalizeName,
  normalizeEmail,
  validateFullName,
  validateEmail,
  validateLocation,
  validateBio,
} = require('../utils/validators');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('learningPath', 'title slug description')
    .populate('careerPathRequest', 'requestedPath status');

  const skills = await UserSkill.find({ user: req.user.id }).populate('skill');

  res.status(200).json({
    success: true,
    user: user.toSafeObject(),
    skills: skills.map((item) => item.skill),
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const name = normalizeName(req.body.name);
    const nameError = validateFullName(name);
    if (nameError) {
      errors.push({ field: 'name', message: nameError });
    } else {
      updates.name = name;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
    const email = normalizeEmail(req.body.email);
    const emailError = validateEmail(email);
    if (emailError) {
      errors.push({ field: 'email', message: emailError });
    } else if (email !== req.user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        errors.push({
          field: 'email',
          message: 'An account with this email already exists',
        });
      } else {
        updates.email = email;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'location')) {
    const locationError = validateLocation(req.body.location);
    if (locationError) {
      errors.push({ field: 'location', message: locationError });
    } else {
      updates['profile.location'] = String(req.body.location || '').trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'bio')) {
    const bioError = validateBio(req.body.bio);
    if (bioError) {
      errors.push({ field: 'bio', message: bioError });
    } else {
      updates['profile.bio'] = String(req.body.bio || '').trim();
    }
  }

  if (errors.length) {
    throw new AppError(errors[0].message, 400, errors);
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('learningPath', 'title slug description')
    .populate('careerPathRequest', 'requestedPath status');

  res.status(200).json({
    success: true,
    message: 'Profile updated',
    user: user.toSafeObject(),
  });
});

module.exports = {
  getProfile,
  updateProfile,
};
