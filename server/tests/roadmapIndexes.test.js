process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const { ensureRoadmapIndexes, LEGACY_UNIQUE_NAME } = require('../config/roadmapIndexes');
const { startTestDb, stopTestDb, clearTestDb } = require('./helpers');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

test('legacy unique pathId+stepNo index is dropped so draft and live steps can share a number', async () => {
  const collection = mongoose.connection.collection('roadmapsteps');
  await collection.createIndex({ pathId: 1, stepNo: 1 }, { unique: true, name: LEGACY_UNIQUE_NAME });

  const { dropped } = await ensureRoadmapIndexes();
  assert.equal(dropped.includes(LEGACY_UNIQUE_NAME), true);

  const path = await LearningPath.create({
    title: 'Index Path',
    pathName: 'Index Path',
    slug: 'index-path',
  });

  await RoadmapStep.create({
    pathId: path._id,
    stepNo: 1,
    title: 'Live HTML',
    isPublished: true,
  });
  await RoadmapStep.create({
    pathId: path._id,
    stepNo: 1,
    title: 'Draft HTML',
    isPublished: false,
  });

  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, stepNo: 1 }), 2);
});
