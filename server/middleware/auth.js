const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id);

    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Authentication required', 401);
  }
});

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}

const requireAdmin = requireRoles('admin');

function requireNotOrganization(req, _res, next) {
  if (req.user && req.user.role === 'organization') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
}

function requireOnboardingComplete(req, _res, next) {
  if (req.user.role === 'student' && !req.user.onboardingCompleted) {
    return next(new AppError('Complete onboarding to continue', 403));
  }
  next();
}

module.exports = {
  protect,
  requireRoles,
  requireAdmin,
  requireNotOrganization,
  requireOnboardingComplete,
};
