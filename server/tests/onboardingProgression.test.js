process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const UserProgress = require('../models/UserProgress');
const UserSkill = require('../models/UserSkill');
const { app, startTestDb, stopTestDb, clearTestDb, authed } = require('./helpers');
const { calculateLevel, xpIntoLevel, roadmapProgressPercent } = require('../utils/level');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

async function seedWebPath() {
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const css = await Skill.create({ name: 'CSS', slug: 'css' });
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'javascript' });
  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    slug: 'web-development',
    isPublished: true,
    skills: [html._id, css._id, javascript._id],
  });

  const steps = [
    { stepNo: 1, title: 'HTML Fundamentals', xpReward: 50, skills: [html._id] },
    { stepNo: 2, title: 'CSS Fundamentals', xpReward: 75, skills: [css._id] },
    { stepNo: 3, title: 'Responsive Web Design', xpReward: 75, skills: [html._id, css._id] },
    { stepNo: 4, title: 'Build Tools', xpReward: 80, skills: [] },
    { stepNo: 5, title: 'JavaScript Fundamentals', xpReward: 100, skills: [javascript._id] },
  ];

  const created = [];
  for (const step of steps) {
    created.push(
      await RoadmapStep.create({
        pathId: path._id,
        isPublished: true,
        ...step,
      })
    );
  }

  return { path, html, css, javascript, steps: created };
}

async function registerOnboard(payload) {
  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi Nair',
      email: `onboard-${Date.now()}-${Math.random()}@example.com`,
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);

  const token = registered.body.token;
  const complete = await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  return { token, complete, email: registered.body.user.email };
}

test('beginner onboarding awards no XP and starts at step 1', async () => {
  const { path, steps } = await seedWebPath();
  const { token, complete } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: true,
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.body.user.xp, 0);
  assert.equal(complete.body.user.level, 1);

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.progression.completedSteps, 0);
  assert.equal(profile.body.progression.progressPercent, 0);
  assert.equal(String(profile.body.progression.currentStepId), String(steps[0]._id));
  assert.equal(await UserProgress.countDocuments(), 0);
});

test('HTML and CSS onboarding completes corresponding prefix steps and awards XP once', async () => {
  const { path, html, css, steps } = await seedWebPath();
  const { token, complete } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: false,
    skillIds: [html.id, css.id],
  });
  assert.equal(complete.status, 200);

  const expectedXp = 50 + 75 + 75;
  assert.equal(complete.body.user.xp, expectedXp);
  assert.equal(complete.body.user.level, calculateLevel(expectedXp));
  assert.equal(complete.body.user.xpIntoLevel, xpIntoLevel(expectedXp));

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.progression.completedSteps, 3);
  assert.equal(
    profile.body.progression.progressPercent,
    roadmapProgressPercent(3, 5)
  );
  assert.equal(String(profile.body.progression.currentStepId), String(steps[3]._id));

  const retry = await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningPathId: path.id,
      isBeginner: false,
      skillIds: [html.id, css.id],
    })
    .expect(400);
  assert.match(retry.body.message, /already complete/i);

  const afterRetry = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(afterRetry.body.user.xp, expectedXp);
  assert.equal(afterRetry.body.progression.completedSteps, 3);
});

test('a later-step skill does not complete earlier unpublished progress or skip steps 1-5', async () => {
  const { path, javascript, steps } = await seedWebPath();
  const { token, complete } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: false,
    skillIds: [javascript.id],
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.body.user.xp, 0);
  assert.equal(complete.body.user.level, 1);

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.progression.completedSteps, 0);
  assert.equal(String(profile.body.progression.currentStepId), String(steps[0]._id));
  assert.equal(await UserSkill.countDocuments(), 1);
});

test('one existing skill completes only the matching prefix', async () => {
  const { path, html, steps } = await seedWebPath();
  const { token } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: false,
    skillIds: [html.id],
  });

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.user.xp, 50);
  assert.equal(profile.body.progression.completedSteps, 1);
  assert.equal(String(profile.body.progression.currentStepId), String(steps[1]._id));
});

test('progress persists after fetching the current user again', async () => {
  const { path, html, css } = await seedWebPath();
  const { token } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: false,
    skillIds: [html.id, css.id],
  });

  const first = await authed('get', '/api/auth/me', token).expect(200);
  const second = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(first.body.user.xp, 200);
  assert.equal(second.body.user.xp, 200);
  assert.equal(second.body.progression.completedSteps, 3);
});
