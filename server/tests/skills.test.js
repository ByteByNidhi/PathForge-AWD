process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const LearningPath = require('../models/LearningPath');
const Opportunity = require('../models/Opportunity');
const {
  app,
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  authed,
} = require('./helpers');
const request = require('supertest');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

test('custom skill names are created or reused and assigned to the user', async () => {
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const { token, user } = await createStudent();

  const created = await authed('post', '/api/skills/me', token)
    .send({ skillName: 'Rust Systems' })
    .expect(200);

  assert.equal(created.body.skills.some((skill) => skill.name === 'Rust Systems'), true);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 1);

  const duplicate = await authed('post', '/api/skills/me', token)
    .send({ name: 'rust systems' })
    .expect(400);

  assert.match(duplicate.body.message, /already have this skill/i);
  assert.equal(await Skill.countDocuments({ name: /rust systems/i }), 1);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 1);

  await authed('post', '/api/skills/me', token).send({ skillIds: [html.id] }).expect(200);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 2);

  const mine = await authed('get', '/api/skills/me', token).expect(200);
  const rust = mine.body.skills.find((skill) => skill.name === 'Rust Systems');
  await authed('delete', `/api/skills/me/${rust._id || rust.id}`, token).expect(200);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 1);
});

test('onboarding experienced users can add a custom skill with catalogue skills', async () => {
  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    slug: 'web-dev-custom-skill',
    isPublished: true,
  });
  const html = await Skill.create({ name: 'HTML', slug: 'html-onboard' });
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'js-onboard' });
  const opportunity = await Opportunity.create({
    title: 'Rust Internship',
    organization: 'Forge Labs',
    type: 'Internship',
    requiredSkills: 'Rust, HTML',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
    applicationUrl: 'https://example.com/apply',
  });

  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Skill Tester',
      email: `skill-${Date.now()}@example.com`,
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);

  const token = registered.body.token;
  await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningPathId: path.id,
      isBeginner: false,
      skillIds: [html.id],
      skillNames: ['Rust'],
    })
    .expect(200);

  const mine = await authed('get', '/api/skills/me', token).expect(200);
  const names = mine.body.skills.map((skill) => skill.name).sort();
  assert.deepEqual(names, ['HTML', 'Rust']);

  const studio = await authed('get', '/api/ai-studio', token).expect(200);
  assert.equal(studio.body.context.skillNames.includes('Rust'), true);

  const hub = await authed('get', '/api/opportunities', token).expect(200);
  const match = hub.body.opportunities.find((item) => item.title === 'Rust Internship');
  assert.ok(match);
  assert.equal(match.skillMatch.hasUserSkills, true);
  assert.ok(match.skillMatch.percent >= 50);

  await authed('post', '/api/skills/me', token).send({ skillIds: [javascript.id] }).expect(200);
  const after = await authed('get', '/api/skills/me', token).expect(200);
  assert.equal(after.body.skills.some((skill) => skill.name === 'JavaScript'), true);
});

test('Git vs git and whitespace resolve to the same catalogue skill', async () => {
  const git = await Skill.create({ name: 'Git', slug: 'git' });
  const { token, user } = await createStudent();

  const typed = await authed('post', '/api/skills/me', token)
    .send({ skillName: ' git ' })
    .expect(200);

  assert.equal(typed.body.skills.length, 1);
  assert.equal(typed.body.skills[0].name, 'Git');
  assert.equal(String(typed.body.skills[0]._id || typed.body.skills[0].id), String(git._id));
  assert.equal(await Skill.countDocuments({ name: /^git$/i }), 1);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 1);

  const again = await authed('post', '/api/skills/me', token).send({ skillName: 'GIT' }).expect(400);
  assert.match(again.body.message, /already have this skill/i);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 1);
});

test('catalogue skill typed as custom during onboarding does not create a duplicate', async () => {
  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    slug: 'web-dev-git-dup',
    isPublished: true,
  });
  const git = await Skill.create({ name: 'Git', slug: 'git-onboard' });
  path.skills = [git._id];
  await path.save();

  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Git Tester',
      email: `git-${Date.now()}@example.com`,
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);

  const token = registered.body.token;
  await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningPathId: path.id,
      isBeginner: false,
      skillIds: [git.id],
      skillNames: ['git', ' Git '],
    })
    .expect(200);

  const mine = await authed('get', '/api/skills/me', token).expect(200);
  assert.equal(mine.body.skills.length, 1);
  assert.equal(mine.body.skills[0].name, 'Git');
  assert.equal(await Skill.countDocuments({ name: /^git$/i }), 1);
});

test('whitespace-only and empty custom skills are rejected', async () => {
  const { token } = await createStudent();
  await authed('post', '/api/skills/me', token).send({ skillName: '   ' }).expect(400);
  await authed('post', '/api/skills/me', token).send({ skillName: '' }).expect(400);
});

test('genuinely new custom skills are reused by normalized name', async () => {
  const { token, user } = await createStudent();
  await authed('post', '/api/skills/me', token).send({ skillName: 'Public Speaking' }).expect(200);
  await authed('post', '/api/skills/me', token).send({ skillName: 'public speaking' }).expect(400);
  assert.equal(await Skill.countDocuments({ name: /public speaking/i }), 1);
  assert.equal(await UserSkill.countDocuments({ user: user._id }), 1);
});
