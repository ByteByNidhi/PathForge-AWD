const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const {
  normalizeName,
  normalizeEmail,
  validateFullName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} = require('../utils/validators');

function collectErrors(pairs) {
  return pairs
    .filter((pair) => pair.message)
    .map((pair) => ({ field: pair.field, message: pair.message }));
}

function throwIfInvalid(errors) {
  if (errors.length) {
    throw new AppError(errors[0].message, 400, errors);
  }
}

const register = asyncHandler(async (req, res) => {
  const name = normalizeName(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  const passwordConfirmation = req.body.passwordConfirmation;

  throwIfInvalid(
    collectErrors([
      { field: 'name', message: validateFullName(name) },
      { field: 'email', message: validateEmail(email) },
      { field: 'password', message: validatePassword(password) },
      {
        field: 'passwordConfirmation',
        message: validatePasswordConfirmation(password, passwordConfirmation),
      },
    ])
  );

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, [
      { field: 'email', message: 'An account with this email already exists' },
    ]);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'student',
  });

  const token = signToken(user.id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: user.toSafeObject(),
  });
});

const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!email || !password) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = await User.findOne({ email }).select('+password');
  const valid = user ? await user.comparePassword(password) : false;

  if (!user || !valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user.id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: user.toSafeObject(),
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('learningPath', 'title pathName slug description isPublished')
    .populate('careerPathRequest', 'requestedPath status');

  res.status(200).json({
    success: true,
    user: user.toSafeObject(),
  });
});

module.exports = {
  register,
  login,
  me,
};
