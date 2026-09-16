const User = require('../models/User');
const UserSkill = require('../models/UserSkill');
const UserProgress = require('../models/UserProgress');
const RoadmapStep = require('../models/RoadmapStep');
const OrganizationUser = require('../models/OrganizationUser');
const AppError = require('../utils/AppError');
const { isValidId } = require('../utils/ids');
const { serializeSkill } = require('../utils/serializers');

function displayRole(user, hasOrganization) {
  if (user.role === 'admin') {
    return 'Admin';
  }
  if (user.role === 'organization' || hasOrganization) {
    return 'Organization';
  }
  return 'User';
}

async function organizationFlags(userIds) {
  const memberships = await OrganizationUser.find({ userId: { $in: userIds } }).select('userId');
  return new Set(memberships.map((row) => String(row.userId)));
}

async function list() {
  const users = await User.find().populate('learningPath', 'title pathName').sort({ name: 1 });
  const orgUsers = await organizationFlags(users.map((user) => user._id));

  return {
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: displayRole(user, orgUsers.has(String(user._id))),
      accountRole: user.role,
      pathName: user.learningPath?.pathName || user.learningPath?.title || 'None',
      xp: Number(user.xp) || 0,
      level: Number(user.level) || 1,
    })),
  };
}

async function show(id) {
  if (!isValidId(id)) {
    throw new AppError('User not found', 404);
  }

  const user = await User.findById(id).populate('learningPath', 'title pathName');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const [skillRows, orgUsers] = await Promise.all([
    UserSkill.find({ user: user._id }).populate('skill'),
    organizationFlags([user._id]),
  ]);

  let completedSteps = 0;
  let totalSteps = 0;
  if (user.learningPath) {
    const stepIds = await RoadmapStep.find({
      pathId: user.learningPath._id,
      isPublished: true,
    }).select('_id');
    totalSteps = stepIds.length;
    if (totalSteps) {
      completedSteps = await UserProgress.countDocuments({
        userId: user._id,
        roadmapStepId: { $in: stepIds.map((step) => step._id) },
        status: 'completed',
      });
    }
  }

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: displayRole(user, orgUsers.has(String(user._id))),
      accountRole: user.role,
      pathName: user.learningPath?.pathName || user.learningPath?.title || 'None',
      xp: Number(user.xp) || 0,
      level: Number(user.level) || 1,
      completedSteps,
      totalSteps,
      joinedAt: user.createdAt,
      skills: skillRows.map((row) => serializeSkill(row.skill)).filter(Boolean),
    },
  };
}

module.exports = {
  list,
  show,
};
