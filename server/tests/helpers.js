process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
require('../models/Achievement');
require('../models/UserAchievement');
require('../models/UserProgress');
require('../models/RoadmapStep');
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

module.exports = {
  app,
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  authed,
};
