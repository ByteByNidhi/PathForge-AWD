const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  isAdminUser,
  isOrganizationMember,
  isOwner,
  resolveOrganizationAccess,
} = require('../services/organizationAccess');

const requireOrganization = asyncHandler(async (req, _res, next) => {
  const access = await resolveOrganizationAccess(req.user);
  if (!access) {
    throw new AppError('Organization access required.', 403);
  }

  req.organization = access.organization;
  req.organizationMembership = access.membership;
  next();
});

function requireOrganizationOwner(req, _res, next) {
  if (!isOwner(req.organizationMembership)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
}

const rejectOrganizationMembersFromStudentApis = asyncHandler(async (req, _res, next) => {
  if (isAdminUser(req.user)) {
    return next();
  }

  if (await isOrganizationMember(req.user)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  next();
});

module.exports = {
  requireOrganization,
  requireOrganizationOwner,
  rejectOrganizationMembersFromStudentApis,
};
