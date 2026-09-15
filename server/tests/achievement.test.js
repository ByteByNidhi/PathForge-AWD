const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const UserProgress = require('../models/UserProgress');
const UserSkill = require('../models/UserSkill');
const User = require('../models/User');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const { seedAchievements } = require('../scripts/seedLib');
const {
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  authed,
} = require('./helpers');

async function createPath(pathName, extras = {}) {
  const slug = `${pathName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return LearningPath.create({
    title: pathName,
    pathName,
    description: extras.description || `${pathName} path`,
    slug: extras.slug || slug,
    isPublished: extras.isPublished !== false,
    skills: extras.skills || [],
  });
}

async function createStep(path, stepNo, extras = {}) {
  return RoadmapStep.create({
    pathId: path._id,
    stepNo,
    title: extras.title || `Step ${stepNo}`,
    description: extras.description || null,
    xpReward: extras.xpReward ?? 50,
    isPublished: extras.isPublished !== false,
    skills: extras.skills || [],
  });
}

function completeStep(token, path, step) {
  return authed('post', `/api/learning-paths/${path.id}/steps/${step.id}/complete`, token);
}

async function unlockRecord(user, slug) {
  const achievement = await Achievement.findOne({ slug });
  assert.ok(achievement, `missing achievement ${slug}`);
  return UserAchievement.findOne({ userId: user._id, achievementId: achievement._id });
}

async function unlockCount(user, slug) {
  const achievement = await Achievement.findOne({ slug });
  return UserAchievement.countDocuments({ userId: user._id, achievementId: achievement._id });
}

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  await seedAchievements();
});

test('path-ignited unlocks at 1 completed step and is not duplicated', async () => {
  const path = await createPath('Web Development');
  const step = await createStep(path, 1, { xpReward: 50 });
  const { token, user } = await createStudent({ learningPath: path._id });

  await completeStep(token, path, step).expect(200);

  assert.ok(await unlockRecord(user, 'path-ignited'));
  assert.equal(await unlockCount(user, 'path-ignited'), 1);
  assert.equal(await unlockRecord(user, 'trailblazer'), null);

  await completeStep(token, path, step).expect(200);
  assert.equal(await unlockCount(user, 'path-ignited'), 1);

  const achievement = await Achievement.findOne({ slug: 'path-ignited' });
  await assert.rejects(
    () =>
      UserAchievement.create({
        userId: user._id,
        achievementId: achievement._id,
      }),
    /E11000|duplicate/i
  );
});

test('trailblazer unlocks at 10 completed steps', async () => {
  const path = await createPath('Web Development');
  const steps = [];
  for (let stepNo = 1; stepNo <= 20; stepNo += 1) {
    steps.push(await createStep(path, stepNo, { xpReward: 10 }));
  }
  const { token, user } = await createStudent({ learningPath: path._id });

  for (let index = 0; index < 9; index += 1) {
    await completeStep(token, path, steps[index]).expect(200);
  }

  assert.ok(await unlockRecord(user, 'path-ignited'));
  assert.equal(await unlockRecord(user, 'trailblazer'), null);

  await completeStep(token, path, steps[9]).expect(200);
  assert.ok(await unlockRecord(user, 'trailblazer'));
  assert.ok(await unlockRecord(user, 'summit-seeker'));
});

test('summit-seeker unlocks at 50% roadmap', async () => {
  const path = await createPath('Web Development');
  const first = await createStep(path, 1, { xpReward: 10 });
  await createStep(path, 2, { xpReward: 10 });
  const { token, user } = await createStudent({ learningPath: path._id });

  await completeStep(token, path, first).expect(200);

  assert.ok(await unlockRecord(user, 'path-ignited'));
  assert.ok(await unlockRecord(user, 'summit-seeker'));
  assert.equal(await unlockCount(user, 'summit-seeker'), 1);
});

test('skillforged unlocks at 5 UserSkill records', async () => {
  const skills = [];
  for (let index = 1; index <= 5; index += 1) {
    skills.push(await Skill.create({ name: `Skill ${index}`, slug: `skill-${index}` }));
  }
  const { token, user } = await createStudent();

  for (let index = 0; index < 4; index += 1) {
    await authed('post', '/api/skills/me', token)
      .send({ skillIds: [skills[index].id] })
      .expect(200);
  }

  assert.equal(await unlockRecord(user, 'skillforged'), null);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 4);

  await authed('post', '/api/skills/me', token)
    .send({ skillIds: [skills[4].id] })
    .expect(200);

  assert.ok(await unlockRecord(user, 'skillforged'));
  assert.equal(await unlockCount(user, 'skillforged'), 1);
});

test('xp-overdrive unlocks at 500 XP and ascendant unlocks at Level 5', async () => {
  const path = await createPath('Web Development');
  const step = await createStep(path, 1, { xpReward: 500 });
  const { token, user } = await createStudent({ learningPath: path._id, xp: 0 });

  await completeStep(token, path, step).expect(200);

  const fresh = await User.findById(user._id);
  assert.equal(fresh.xp, 500);
  assert.equal(fresh.level, 6);
  assert.ok(await unlockRecord(user, 'path-ignited'));
  assert.ok(await unlockRecord(user, 'xp-overdrive'));
  assert.ok(await unlockRecord(user, 'ascendant'));
  assert.equal(await unlockRecord(user, 'trailblazer'), null);
});

test('ascendant unlocks at Level 5 without xp-overdrive', async () => {
  const { user } = await createStudent({ xp: 0 });
  await user.addXp(400);

  const fresh = await User.findById(user._id);
  assert.equal(fresh.level, 5);
  assert.ok(await unlockRecord(user, 'ascendant'));
  assert.equal(await unlockRecord(user, 'xp-overdrive'), null);
});

test('roadmap completion does not add roadmap skills to UserSkill', async () => {
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const css = await Skill.create({ name: 'CSS', slug: 'css' });
  const path = await createPath('Web Development');
  const step = await createStep(path, 1, { xpReward: 50, skills: [html._id, css._id] });
  const { token, user } = await createStudent({ learningPath: path._id });

  await completeStep(token, path, step).expect(200);

  assert.equal(await UserSkill.countDocuments({ user: user._id }), 0);
  assert.equal(await unlockRecord(user, 'skillforged'), null);
});

test('achievements endpoint returns correct locked and unlocked state', async () => {
  const path = await createPath('Web Development');
  const step = await createStep(path, 1, { xpReward: 50 });
  await createStep(path, 2, { xpReward: 50 });
  await createStep(path, 3, { xpReward: 50 });
  const { token } = await createStudent({ learningPath: path._id });

  const before = await authed('get', '/api/achievements', token).expect(200);
  assert.equal(before.body.achievements.length, 6);
  assert.equal(before.body.unlocked.length, 0);
  assert.equal(before.body.locked.length, 6);
  assert.deepEqual(
    before.body.achievements.map((item) => item.slug),
    ['path-ignited', 'trailblazer', 'summit-seeker', 'skillforged', 'xp-overdrive', 'ascendant']
  );
  assert.equal(before.body.achievements[0].unlocked, false);

  await completeStep(token, path, step).expect(200);

  const after = await authed('get', '/api/achievements', token).expect(200);
  const ignited = after.body.achievements.find((item) => item.slug === 'path-ignited');
  assert.equal(ignited.unlocked, true);
  assert.ok(ignited.unlockedAt);
  assert.equal(after.body.unlocked.length, 1);
  assert.equal(after.body.locked.length, 5);
});

test('completed roadmap has no current step', async () => {
  const path = await createPath('Web Development');
  const first = await createStep(path, 1, { xpReward: 10 });
  const second = await createStep(path, 2, { xpReward: 10 });
  const { token } = await createStudent({ learningPath: path._id });

  await completeStep(token, path, first).expect(200);
  const done = await completeStep(token, path, second).expect(200);

  assert.equal(done.body.currentStepId, null);
  assert.equal(done.body.completedSteps, 2);
  assert.equal(done.body.totalPublishedSteps, 2);
  assert.equal(done.body.progressPercent, 100);
  assert.equal(done.body.steps.every((step) => step.state === 'completed'), true);

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.progression.currentStepId, null);
  assert.equal(profile.body.progression.currentStep, null);
  assert.equal(profile.body.progression.roadmapCompleted, true);
  assert.equal(profile.body.progression.progressPercent, 100);
});

test('dashboard progression data is correct after completing a step', async () => {
  const path = await createPath('Web Development');
  const first = await createStep(path, 1, { title: 'HTML Fundamentals', xpReward: 50 });
  const second = await createStep(path, 2, { title: 'CSS Fundamentals', xpReward: 75 });
  const { token } = await createStudent({ learningPath: path._id });

  const before = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(before.body.progression.progressPercent, 0);
  assert.equal(before.body.progression.currentStepId, String(first._id));
  assert.equal(before.body.progression.currentStep.title, 'HTML Fundamentals');
  assert.equal(before.body.progression.completedSteps, 0);
  assert.equal(before.body.progression.totalPublishedSteps, 2);
  assert.equal(before.body.progression.totalXp, 0);
  assert.equal(before.body.progression.level, 1);

  const completed = await completeStep(token, path, first).expect(200);
  assert.equal(completed.body.currentStepId, String(second._id));
  assert.equal(completed.body.totalXp, 50);
  assert.equal(completed.body.level, 1);
  assert.equal(completed.body.xpIntoLevel, 50);
  assert.equal(completed.body.progressPercent, 50);

  const after = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(after.body.progression.progressPercent, 50);
  assert.equal(after.body.progression.completedSteps, 1);
  assert.equal(after.body.progression.currentStepId, String(second._id));
  assert.equal(after.body.progression.currentStep.title, 'CSS Fundamentals');
  assert.equal(after.body.progression.totalXp, 50);
  assert.equal(after.body.progression.xpIntoLevel, 50);
  assert.equal(after.body.user.xp, 50);
});
