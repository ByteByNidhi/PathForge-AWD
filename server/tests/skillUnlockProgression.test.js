process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const UserSkill = require('../models/UserSkill');
const { app, startTestDb, stopTestDb, clearTestDb, authed } = require('./helpers');
const { roadmapProgressPercent } = require('../utils/level');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

async function seedPath() {
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const css = await Skill.create({ name: 'CSS', slug: 'css' });
  const java = await Skill.create({ name: 'Java', slug: 'java' });
  const react = await Skill.create({ name: 'React', slug: 'react' });
  const typescript = await Skill.create({ name: 'TypeScript', slug: 'typescript' });
  const git = await Skill.create({ name: 'Git', slug: 'git' });
  const speaking = await Skill.create({ name: 'Public Speaking', slug: 'public-speaking' });

  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    slug: 'web-development',
    isPublished: true,
    skills: [html._id, css._id, java._id, react._id, typescript._id, git._id],
  });

  const defs = [
    { stepNo: 1, title: 'HTML', xpReward: 50, skills: [html._id] },
    { stepNo: 2, title: 'CSS', xpReward: 75, skills: [css._id] },
    { stepNo: 3, title: 'Java', xpReward: 80, skills: [java._id] },
    { stepNo: 4, title: 'HTML/CSS/Java', xpReward: 90, skills: [html._id, css._id, java._id] },
    { stepNo: 5, title: 'React', xpReward: 100, skills: [react._id] },
    { stepNo: 6, title: 'TypeScript', xpReward: 110, skills: [typescript._id] },
    { stepNo: 7, title: 'Git', xpReward: 40, skills: [git._id] },
  ];

  const steps = [];
  for (const def of defs) {
    steps.push(
      await RoadmapStep.create({
        pathId: path._id,
        isPublished: true,
        ...def,
      })
    );
  }

  return { path, html, css, java, react, typescript, git, speaking, steps };
}

async function registerOnboard(payload) {
  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi Nair',
      email: `unlock-${Date.now()}-${Math.random()}@example.com`,
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);

  const token = registered.body.token;
  const complete = await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  return { token, complete, userId: registered.body.user._id || registered.body.user.id };
}

function findStep(roadmap, title) {
  return roadmap.steps.find((step) => step.title === title);
}

test('user without the required skill cannot bypass the sequence', async () => {
  const { path, steps } = await seedPath();
  const { token, complete } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: true,
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.body.user.xp, 0);

  const blocked = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${steps[6].id}/complete`,
    token
  ).expect(403);
  assert.match(blocked.body.message, /current roadmap step/i);

  const roadmap = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(findStep(roadmap.body, 'Git').state, 'locked');
  assert.equal(findStep(roadmap.body, 'Git').locked, true);
  assert.equal(findStep(roadmap.body, 'HTML').state, 'current');
});

test('adding a matching skill after onboarding unlocks that later step without awarding XP', async () => {
  const { path, git, steps } = await seedPath();
  const { token, userId } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: true,
  });

  const before = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(before.body.user.xp, 0);
  assert.equal(before.body.progression.completedSteps, 0);

  const added = await authed('post', '/api/skills/me', token).send({ skillIds: [git.id] }).expect(200);
  assert.equal(added.body.skills.some((skill) => skill.name === 'Git'), true);
  assert.equal(await UserSkill.countDocuments({ user: userId, skill: git._id }), 1);

  const afterAdd = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(afterAdd.body.user.xp, 0);
  assert.equal(afterAdd.body.progression.completedSteps, 0);
  assert.equal(await UserProgress.countDocuments({ userId }), 0);

  const roadmap = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  const gitStep = findStep(roadmap.body, 'Git');
  const reactStep = findStep(roadmap.body, 'React');
  const tsStep = findStep(roadmap.body, 'TypeScript');
  const htmlStep = findStep(roadmap.body, 'HTML');

  assert.equal(gitStep.state, 'available');
  assert.equal(gitStep.available, true);
  assert.equal(gitStep.completed, false);
  assert.equal(gitStep.locked, false);
  assert.equal(htmlStep.state, 'current');
  assert.equal(reactStep.state, 'locked');
  assert.equal(tsStep.state, 'locked');
  assert.equal(String(roadmap.body.currentStepId), String(steps[0]._id));

  const completed = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${steps[6].id}/complete`,
    token
  ).expect(200);

  assert.equal(completed.body.alreadyCompleted, false);
  assert.equal(completed.body.totalXp, 40);
  assert.equal(completed.body.completedSteps, 1);
  assert.equal(completed.body.progressPercent, roadmapProgressPercent(1, 7));
  assert.equal(findStep(completed.body, 'Git').state, 'completed');
  assert.equal(findStep(completed.body, 'Git').completed, true);
  assert.equal(findStep(completed.body, 'React').state, 'locked');
  assert.equal(findStep(completed.body, 'TypeScript').state, 'locked');
  assert.equal(findStep(completed.body, 'HTML').state, 'current');

  const duplicateComplete = await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${steps[6].id}/complete`,
    token
  ).expect(200);
  assert.equal(duplicateComplete.body.alreadyCompleted, true);
  assert.equal(duplicateComplete.body.totalXp, 40);
  assert.equal(await UserProgress.countDocuments({ userId, roadmapStepId: steps[6]._id }), 1);

  const fresh = await User.findById(userId);
  assert.equal(fresh.xp, 40);
});

test('a nonmatching skill does not unlock unrelated later steps', async () => {
  const { path, speaking, steps } = await seedPath();
  const { token } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: true,
  });

  await authed('post', '/api/skills/me', token).send({ skillIds: [speaking.id] }).expect(200);

  const roadmap = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(findStep(roadmap.body, 'Git').state, 'locked');
  assert.equal(findStep(roadmap.body, 'React').state, 'locked');
  assert.equal(findStep(roadmap.body, 'HTML').state, 'current');

  await authed(
    'post',
    `/api/learning-paths/${path.id}/steps/${steps[6].id}/complete`,
    token
  ).expect(403);
});

test('duplicate skill additions do not create duplicate UserSkill records', async () => {
  const { git } = await seedPath();
  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi Nair',
      email: `dup-skill-${Date.now()}@example.com`,
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);
  const token = registered.body.token;
  const userId = registered.body.user._id || registered.body.user.id;

  await authed('post', '/api/skills/me', token).send({ skillIds: [git.id] }).expect(200);
  await authed('post', '/api/skills/me', token).send({ skillIds: [git.id] }).expect(200);

  assert.equal(await UserSkill.countDocuments({ user: userId, skill: git._id }), 1);
  assert.equal(await UserSkill.countDocuments({ user: userId }), 1);
});

test('existing onboarding skill prefix completion remains unchanged', async () => {
  const { path, html, css, java, steps } = await seedPath();
  const { token, complete } = await registerOnboard({
    learningPathId: path.id,
    isBeginner: false,
    skillIds: [html.id, css.id, java.id],
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.body.user.xp, 50 + 75 + 80 + 90);

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.progression.completedSteps, 4);
  assert.equal(String(profile.body.progression.currentStepId), String(steps[4]._id));

  const roadmap = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(findStep(roadmap.body, 'HTML').state, 'completed');
  assert.equal(findStep(roadmap.body, 'CSS').state, 'completed');
  assert.equal(findStep(roadmap.body, 'Java').state, 'completed');
  assert.equal(findStep(roadmap.body, 'HTML/CSS/Java').state, 'completed');
  assert.equal(findStep(roadmap.body, 'React').state, 'current');
  assert.equal(findStep(roadmap.body, 'Git').state, 'locked');
});
