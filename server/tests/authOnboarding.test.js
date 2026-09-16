process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const LearningPath = require('../models/LearningPath');
const Skill = require('../models/Skill');
const { startTestDb, stopTestDb, clearTestDb } = require('./helpers');
const { app } = require('./helpers');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

test('register, login, and onboarding still work', async () => {
  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    description: 'Build practical skills for a career in web development',
    slug: 'web-development',
    isPublished: true,
  });
  await Skill.create({ name: 'HTML', slug: 'html' });

  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);

  assert.equal(registered.body.success, true);
  assert.ok(registered.body.token);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ada@example.com', password: 'password12' })
    .expect(200);

  const token = login.body.token;
  const onboarding = await request(app)
    .get('/api/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(onboarding.body.onboardingCompleted, false);
  assert.equal(onboarding.body.learningPaths[0].title, 'Web Development');

  const complete = await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningPathId: path.id,
      isBeginner: true,
    })
    .expect(200);

  assert.equal(complete.body.user.onboardingCompleted, true);
  assert.equal(String(complete.body.user.learningPath._id), String(path._id));

  const health = await request(app).get('/api/health').expect(200);
  assert.equal(health.body.database, 'connected');
});

test('registration rejects numeric and symbol names and malformed emails', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi123',
      email: 'valid@example.com',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(400);

  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi@',
      email: 'valid2@example.com',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(400);

  const ok = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi Nair',
      email: '  nidhi.nair@example.com  ',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);
  assert.equal(ok.body.user.name, 'Nidhi Nair');
  assert.equal(ok.body.user.email, 'nidhi.nair@example.com');
  assert.equal(ok.body.user.password, undefined);

  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi',
      email: 'test@',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(400);

  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi',
      email: 'test.com',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(400);

  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi',
      email: '@gmail.com',
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(400);

  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Nidhi',
      email: 'match@example.com',
      password: 'password12',
      passwordConfirmation: 'password99',
    })
    .expect(400);
});
