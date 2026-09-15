const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User');
const {
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  authed,
} = require('./helpers');

async function createPath(pathName, extras = {}) {
  const slug = pathName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
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

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

test('learning paths are ordered by path name', async () => {
  await createPath('Web Development');
  await createPath('Cybersecurity');
  await createPath('AI & Machine Learning');
  const { token } = await createStudent();

  const response = await authed('get', '/api/learning-paths', token).expect(200);
  const names = response.body.learningPaths.map((path) => path.pathName);
  assert.deepEqual(names, ['AI & Machine Learning', 'Cybersecurity', 'Web Development']);
});

test('published steps only are visible to students', async () => {
  const path = await createPath('Web Development');
  const published = await createStep(path, 1, { title: 'HTML Fundamentals', xpReward: 50 });
  await createStep(path, 2, { title: 'Hidden Draft', isPublished: false, xpReward: 75 });
  const { token } = await createStudent({ learningPath: path._id });

  const response = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(response.body.steps.length, 1);
  assert.equal(response.body.steps[0].id, String(published._id));
  assert.equal(response.body.steps[0].title, 'HTML Fundamentals');
});

test('steps are ordered by stepNo then _id', async () => {
  const path = await createPath('Web Development');
  await createStep(path, 3, { title: 'Third' });
  await createStep(path, 1, { title: 'First' });
  await createStep(path, 2, { title: 'Second' });
  const { token } = await createStudent({ learningPath: path._id });

  const response = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.deepEqual(
    response.body.steps.map((step) => step.title),
    ['First', 'Second', 'Third']
  );
  assert.deepEqual(
    response.body.steps.map((step) => step.stepNo),
    [1, 2, 3]
  );
});

test('user starts from the first published step', async () => {
  const path = await createPath('Web Development');
  const first = await createStep(path, 1, { title: 'HTML Fundamentals' });
  await createStep(path, 2, { title: 'CSS Fundamentals' });
  const { token } = await createStudent({ learningPath: path._id, xp: 0 });

  const response = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(response.body.currentStepId, String(first._id));
  assert.equal(response.body.steps[0].state, 'current');
  assert.equal(response.body.steps[1].state, 'locked');
  assert.equal(response.body.progressPercent, 0);
});

test('only the current step can be completed and out-of-order is rejected', async () => {
  const path = await createPath('Web Development');
  const first = await createStep(path, 1, { xpReward: 50 });
  const second = await createStep(path, 2, { xpReward: 75 });
  const third = await createStep(path, 3, { xpReward: 100 });
  const { token, user } = await createStudent({ learningPath: path._id });

  await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${third.id}/complete`,
    token
  ).expect(403);

  await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${second.id}/complete`,
    token
  ).expect(403);

  const firstComplete = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${first.id}/complete`,
    token
  ).expect(200);

  assert.equal(firstComplete.body.alreadyCompleted, false);
  assert.equal(firstComplete.body.currentStepId, String(second._id));
  assert.equal(firstComplete.body.totalXp, 50);

  const thirdBlocked = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${third.id}/complete`,
    token
  ).expect(403);
  assert.match(thirdBlocked.body.message, /current roadmap step/i);

  const progressCount = await UserProgress.countDocuments({ userId: user._id });
  assert.equal(progressCount, 1);
});

test('wrong-path completion is rejected', async () => {
  const selected = await createPath('Web Development');
  const other = await createPath('Cybersecurity');
  await createStep(selected, 1, { xpReward: 50 });
  const foreign = await createStep(other, 1, { xpReward: 50 });
  const { token, user } = await createStudent({ learningPath: selected._id });

  const response = await authed(
    'post',
    `/api/learning-paths/${other.id}/steps/${foreign.id}/complete`,
    token
  ).expect(403);

  assert.match(response.body.message, /selected career path/i);
  assert.equal(await UserProgress.countDocuments({ userId: user._id }), 0);
  const fresh = await User.findById(user._id);
  assert.equal(fresh.xp, 0);
});

test('unpublished step cannot be completed', async () => {
  const path = await createPath('Web Development');
  const published = await createStep(path, 1, { isPublished: true, xpReward: 50 });
  const draft = await createStep(path, 2, { isPublished: false, xpReward: 75 });
  const { token } = await createStudent({ learningPath: path._id });

  await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${draft.id}/complete`,
    token
  ).expect(404);

  await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${published.id}/complete`,
    token
  ).expect(200);
});

test('completing a step creates UserProgress and awards the step xpReward once', async () => {
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const path = await createPath('Web Development', { skills: [html._id] });
  const step = await createStep(path, 1, { xpReward: 50, skills: [html._id] });
  const { token, user } = await createStudent({ learningPath: path._id });

  const response = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${step.id}/complete`,
    token
  ).expect(200);

  assert.equal(response.body.totalXp, 50);
  assert.equal(response.body.level, 1);
  assert.equal(response.body.xpIntoLevel, 50);
  assert.equal(response.body.completedSteps, 1);
  assert.equal(response.body.steps[0].skills[0].name, 'HTML');

  const records = await UserProgress.find({ userId: user._id, roadmapStepId: step._id });
  assert.equal(records.length, 1);
  assert.equal(records[0].status, 'completed');
  assert.ok(records[0].completedAt);

  const originalCompletedAt = records[0].completedAt;

  const duplicate = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${step.id}/complete`,
    token
  ).expect(200);

  assert.equal(duplicate.body.alreadyCompleted, true);
  assert.equal(duplicate.body.totalXp, 50);
  assert.equal(await UserProgress.countDocuments({ userId: user._id, roadmapStepId: step._id }), 1);

  const preserved = await UserProgress.findOne({ userId: user._id, roadmapStepId: step._id });
  assert.equal(preserved.completedAt.getTime(), originalCompletedAt.getTime());

  await assert.rejects(
    () =>
      UserProgress.create({
        userId: user._id,
        roadmapStepId: step._id,
        status: 'completed',
        completedAt: new Date(),
      }),
    /E11000|duplicate/i
  );
});

test('roadmap progress is based on completed published steps, not XP', async () => {
  const path = await createPath('Web Development');
  const steps = [];
  for (let stepNo = 1; stepNo <= 20; stepNo += 1) {
    steps.push(await createStep(path, stepNo, { xpReward: stepNo === 1 ? 50 : 10 }));
  }
  const { token } = await createStudent({ learningPath: path._id });

  const response = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${steps[0].id}/complete`,
    token
  ).expect(200);

  assert.equal(response.body.totalXp, 50);
  assert.equal(response.body.xpIntoLevel, 50);
  assert.equal(response.body.completedSteps, 1);
  assert.equal(response.body.totalPublishedSteps, 20);
  assert.equal(response.body.progressPercent, 5);
  assert.notEqual(response.body.progressPercent, response.body.xpIntoLevel);
});

test('switching paths does not delete old progress or unlock the new path', async () => {
  const firstPath = await createPath('Web Development');
  const secondPath = await createPath('Cybersecurity');
  const firstStep = await createStep(firstPath, 1, { xpReward: 50 });
  const newFirst = await createStep(secondPath, 1, { xpReward: 50 });
  await createStep(secondPath, 2, { xpReward: 75 });
  const { token, user } = await createStudent({ learningPath: firstPath._id });

  await authed(
    'post',
    `/api/learning-paths/${firstPath.id}/steps/${firstStep.id}/complete`,
    token
  ).expect(200);

  const switched = await authed('post', `/api/learning-paths/${secondPath.id}/select`, token).expect(
    200
  );
  assert.equal(String(switched.body.user.learningPath._id || switched.body.user.learningPath), String(secondPath._id));

  assert.equal(await UserProgress.countDocuments({ userId: user._id }), 1);

  const roadmap = await authed(
    'get',
    `/api/learning-paths/${secondPath.id}/roadmap`,
    token
  ).expect(200);

  assert.equal(roadmap.body.currentStepId, String(newFirst._id));
  assert.equal(roadmap.body.progressPercent, 0);
  assert.equal(roadmap.body.totalXp, 50);

  await authed(
    'post',
    `/api/learning-paths/${secondPath.id}/steps/${newFirst.id}/complete`,
    token
  ).expect(200);

  assert.equal(await UserProgress.countDocuments({ userId: user._id }), 2);
});

test('zero published steps returns 0% and no current step', async () => {
  const path = await createPath('Empty Path');
  await createStep(path, 1, { isPublished: false, xpReward: 50 });
  const { token } = await createStudent({ learningPath: path._id });

  const response = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(response.body.totalPublishedSteps, 0);
  assert.equal(response.body.completedSteps, 0);
  assert.equal(response.body.progressPercent, 0);
  assert.equal(response.body.currentStepId, null);
  assert.equal(response.body.steps.length, 0);
});

test('level and xpIntoLevel follow the WFS formula after XP awards', async () => {
  const path = await createPath('Web Development');
  const step = await createStep(path, 1, { xpReward: 100 });
  const { token } = await createStudent({ learningPath: path._id, xp: 400 });

  const response = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${step.id}/complete`,
    token
  ).expect(200);

  assert.equal(response.body.totalXp, 500);
  assert.equal(response.body.level, 6);
  assert.equal(response.body.xpIntoLevel, 0);
});
