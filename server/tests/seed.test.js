process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Achievement = require('../models/Achievement');
const { seedDatabase } = require('../scripts/seedLib');
const { startTestDb, stopTestDb, clearTestDb } = require('./helpers');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

test('WFS roadmap seed is idempotent and loads 7 paths with 20 steps each', async () => {
  await clearTestDb();
  const first = await seedDatabase();
  const second = await seedDatabase();

  assert.equal(first.pathCount, 7);
  assert.equal(second.pathCount, 7);
  assert.equal(first.stepCount, 140);
  assert.equal(second.stepCount, 140);
  assert.equal(first.achievementCount, 6);
  assert.equal(second.achievementCount, 6);
  assert.equal(await LearningPath.countDocuments(), 7);
  assert.equal(await RoadmapStep.countDocuments(), 140);
  assert.equal(await Achievement.countDocuments(), 6);

  const web = await LearningPath.findOne({ pathName: 'Web Development' });
  const step = await RoadmapStep.findOne({ pathId: web._id, stepNo: 1 }).populate('skills');
  assert.equal(step.title, 'HTML Fundamentals');
  assert.equal(step.xpReward, 50);
  assert.equal(step.skills[0].name, 'HTML');
});
