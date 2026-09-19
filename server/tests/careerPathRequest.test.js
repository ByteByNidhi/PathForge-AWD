process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-pathforge';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const CareerPathRequest = require('../models/CareerPathRequest');
const { app, startTestDb, stopTestDb, clearTestDb, authed } = require('./helpers');

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

async function registerStudent() {
  const registered = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Ada Lovelace',
      email: `career-${Date.now()}-${Math.random()}@example.com`,
      password: 'password12',
      passwordConfirmation: 'password12',
    })
    .expect(201);
  return { token: registered.body.token, userId: registered.body.user._id || registered.body.user.id };
}

test('career path request is stored as pending and returned on the student profile', async () => {
  const { token, userId } = await registerStudent();

  const complete = await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      isOther: true,
      requestedPath: 'Game Design',
      isBeginner: true,
    })
    .expect(200);

  assert.equal(complete.body.user.careerPathRequest.requestedPath, 'Game Design');
  assert.equal(complete.body.user.careerPathRequest.status, 'pending');
  assert.equal(complete.body.user.learningPath, null);

  const stored = await CareerPathRequest.findOne({ user: userId });
  assert.equal(stored.requestedPath, 'Game Design');
  assert.equal(stored.status, 'pending');

  const profile = await authed('get', '/api/users/me', token).expect(200);
  assert.equal(profile.body.user.careerPathRequest.requestedPath, 'Game Design');
  assert.equal(profile.body.user.careerPathRequest.status, 'pending');
  assert.equal(profile.body.progression.learningPath, null);
});

test('duplicate career path requests are blocked because onboarding cannot run twice', async () => {
  const { token } = await registerStudent();

  await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      isOther: true,
      requestedPath: 'Game Design',
      isBeginner: true,
    })
    .expect(200);

  const retry = await request(app)
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      isOther: true,
      requestedPath: 'Game Design',
      isBeginner: true,
    })
    .expect(400);

  assert.match(retry.body.message, /already complete/i);
  assert.equal(await CareerPathRequest.countDocuments(), 1);
});
