process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationUser = require('../models/OrganizationUser');
require('../models/Achievement');
require('../models/UserAchievement');
require('../models/UserProgress');
require('../models/RoadmapStep');
require('../models/Opportunity');
require('../models/OpportunitySkill');
require('../models/SavedOpportunity');
require('../models/Organization');
require('../models/OrganizationUser');
require('../models/CareerPathRequest');
const { signToken } = require('../utils/token');

let mongo;
const app = createApp();

async function startTestDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
}

async function stopTestDb() {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
}

async function clearTestDb() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

async function createStudent(overrides = {}) {
  const user = await User.create({
    name: overrides.name || 'Test Student',
    email: overrides.email || `student-${Date.now()}-${Math.random()}@example.com`,
    password: 'password12',
    role: 'student',
    onboardingCompleted: overrides.onboardingCompleted !== false,
    learningPath: overrides.learningPath || null,
    xp: overrides.xp || 0,
    level: overrides.level || 1,
  });

  const token = signToken(user.id);
  return { user, token };
}

function authed(method, url, token) {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

async function createOrganizationOwner(overrides = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const organization = await Organization.create({
    name: overrides.orgName || `Test Organization ${suffix}`,
    slug: overrides.slug || `test-org-${suffix}`,
    email: overrides.orgEmail || `org-${suffix}@example.com`,
    phone: overrides.phone || null,
    website: overrides.website || 'https://example.com',
    description: overrides.description || 'Test organization',
    logoUrl: overrides.logoUrl || null,
    status: 'active',
  });

  const user = await User.create({
    name: overrides.name || 'Org Owner',
    email: overrides.email || `owner-${suffix}@example.com`,
    password: 'password12',
    role: overrides.role || 'organization',
    onboardingCompleted: true,
  });

  await OrganizationUser.create({
    organizationId: organization._id,
    userId: user._id,
    role: overrides.membershipRole || 'owner',
  });

  return { organization, user, token: signToken(user.id) };
}

async function addOrganizationMember(organization, overrides = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await User.create({
    name: overrides.name || 'Org Member',
    email: overrides.email || `member-${suffix}@example.com`,
    password: 'password12',
    role: overrides.role || 'organization',
    onboardingCompleted: overrides.onboardingCompleted !== false,
  });

  await OrganizationUser.create({
    organizationId: organization._id,
    userId: user._id,
    role: overrides.membershipRole || 'member',
  });

  return { user, token: signToken(user.id) };
}

async function createAdmin(overrides = {}) {
  const user = await User.create({
    name: overrides.name || 'PathForge Admin',
    email: overrides.email || `admin-${Date.now()}-${Math.random()}@example.com`,
    password: 'password12',
    role: 'admin',
    onboardingCompleted: true,
  });

  return { user, token: signToken(user.id) };
}

module.exports = {
  app,
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  createOrganizationOwner,
  addOrganizationMember,
  createAdmin,
  authed,
};
