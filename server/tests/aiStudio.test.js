const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const env = require('../config/env');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const UserProgress = require('../models/UserProgress');
const geminiService = require('../services/geminiService');
const {
  app,
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  createAdmin,
  createOrganizationOwner,
  authed,
} = require('./helpers');

const originalGemini = {
  key: env.geminiApiKey,
  model: env.geminiModel,
  base: env.geminiApiBase,
};

function configureGemini() {
  env.geminiApiKey = 'test-gemini-key-not-for-clients';
  env.geminiModel = 'gemini-3.6-flash';
  env.geminiApiBase = 'https://generativelanguage.googleapis.com/v1beta';
}

function geminiJsonResponse(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      if (typeof text === 'string') {
        return {
          candidates: [{ content: { parts: [{ text }] } }],
        };
      }
      return text;
    },
  };
}

before(async () => {
  await startTestDb();
});

after(async () => {
  env.geminiApiKey = originalGemini.key;
  env.geminiModel = originalGemini.model;
  env.geminiApiBase = originalGemini.base;
  geminiService.resetFetchImpl();
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  configureGemini();
  geminiService.resetFetchImpl();
});

test('authenticated student can open AI Studio without seeing the API key', async () => {
  const { token, user } = await createStudent({ name: 'Studio Tester' });
  const response = await authed('get', '/api/ai-studio', token).expect(200);
  assert.equal(response.body.context.name, user.name);
  assert.equal(JSON.stringify(response.body).includes('test-gemini-key-not-for-clients'), false);
  assert.equal(JSON.stringify(response.body).includes('GEMINI_API_KEY'), false);
});

test('guest cannot access AI Studio', async () => {
  await request(app).get('/api/ai-studio').expect(401);
  await request(app).post('/api/ai-studio/chat').send({ message: 'What should I learn next?' }).expect(401);
});

test('AI request validation works', async () => {
  const { token } = await createStudent();

  const missing = await authed('post', '/api/ai-studio/chat', token).send({}).expect(422);
  assert.equal(missing.body.errors[0].field, 'message');

  await authed('post', '/api/ai-studio/chat', token).send({ message: '' }).expect(422);
  await authed('post', '/api/ai-studio/chat', token).send({ message: '   ' }).expect(422);
  await authed('post', '/api/ai-studio/chat', token)
    .send({ message: 'a'.repeat(2001) })
    .expect(422);
});

test('Gemini is called through the backend without exposing the API key', async () => {
  let captured;
  geminiService.setFetchImpl(async (url, options) => {
    captured = { url: String(url), options };
    return geminiJsonResponse(
      'Complete your next roadmap step and practise that skill on a small project.'
    );
  });

  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    slug: 'web-development-ai-studio',
    description: 'Build for the web.',
  });
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const { token, user } = await createStudent({ name: 'Studio Tester', learningPath: path._id });
  await UserSkill.create({ user: user._id, skill: html._id });

  const response = await authed('post', '/api/ai-studio/chat', token)
    .send({
      message: 'What should I learn next?',
      name: 'Spoofed Name',
      path: 'Secret Agent',
      api_key: 'client-forged-key',
    })
    .expect(200);

  assert.equal(
    response.body.reply,
    'Complete your next roadmap step and practise that skill on a small project.'
  );
  const payload = JSON.stringify(response.body);
  assert.equal(payload.includes('test-gemini-key-not-for-clients'), false);
  assert.equal(payload.includes('client-forged-key'), false);
  assert.equal(payload.includes('x-goog-api-key'), false);

  assert.match(captured.url, /generativelanguage\.googleapis\.com/);
  assert.match(captured.url, /gemini-3\.6-flash/);
  assert.equal(captured.url.includes('test-gemini-key-not-for-clients'), false);
  assert.equal(captured.url.includes('key='), false);
  assert.equal(captured.options.headers['x-goog-api-key'], 'test-gemini-key-not-for-clients');

  const body = JSON.parse(captured.options.body);
  const system = body.systemInstruction.parts[0].text;
  const userText = body.contents[body.contents.length - 1].parts[0].text;
  assert.equal(userText, 'What should I learn next?');
  assert.match(system, /Studio Tester/);
  assert.equal(system.includes('Spoofed Name'), false);
  assert.equal(system.includes('Secret Agent'), false);
  assert.match(system, /Web Development/);
  assert.match(system, /HTML/);
});

test('API failure is handled gracefully', async () => {
  geminiService.setFetchImpl(async () =>
    geminiJsonResponse({ error: { message: 'internal provider error with secret details' } }, 500)
  );

  const { token } = await createStudent();
  const response = await authed('post', '/api/ai-studio/chat', token)
    .send({ message: 'Review my current progress.' })
    .expect(503);

  assert.equal(
    response.body.message,
    'The career assistant is busy or unavailable. Please try again shortly.'
  );
  assert.equal(JSON.stringify(response.body).includes('internal provider error'), false);
  assert.equal(JSON.stringify(response.body).includes('test-gemini-key-not-for-clients'), false);
});

test('missing API key is handled gracefully', async () => {
  env.geminiApiKey = '';
  let called = false;
  geminiService.setFetchImpl(async () => {
    called = true;
    return geminiJsonResponse('should not run');
  });

  const { token } = await createStudent();
  const response = await authed('post', '/api/ai-studio/chat', token)
    .send({ message: 'How can I improve my skills?' })
    .expect(503);

  assert.equal(
    response.body.message,
    'The career assistant is not available right now. Please try again later.'
  );
  assert.equal(called, false);
});

test('Gemini network failure is handled without leaking provider details', async () => {
  geminiService.setFetchImpl(async () => {
    const error = new Error('connect ETIMEDOUT 8.8.8.8');
    error.name = 'TypeError';
    throw error;
  });

  const { token } = await createStudent();
  const response = await authed('post', '/api/ai-studio/chat', token)
    .send({ message: 'What should I learn next?' })
    .expect(503);

  assert.equal(
    response.body.message,
    'The career assistant could not be reached. Please try again in a moment.'
  );
  assert.equal(JSON.stringify(response.body).includes('ETIMEDOUT'), false);
  assert.equal(JSON.stringify(response.body).includes('8.8.8.8'), false);
});

test('organization members cannot use AI Studio', async () => {
  const { token } = await createOrganizationOwner();
  await authed('get', '/api/ai-studio', token).expect(403);
  await authed('post', '/api/ai-studio/chat', token)
    .send({ message: 'What should I learn next?' })
    .expect(403);
});

test('students cannot complete unpublished AI draft steps', async () => {
  const path = await LearningPath.create({
    title: 'Web Development',
    pathName: 'Web Development',
    slug: 'web-dev-draft-hidden',
  });
  await RoadmapStep.create({
    pathId: path._id,
    stepNo: 1,
    title: 'Set up HTML basics',
    xpReward: 10,
    isPublished: false,
  });
  const { token } = await createStudent({ learningPath: path._id });
  const response = await authed('get', `/api/learning-paths/${path.id}/roadmap`, token).expect(200);
  assert.equal(response.body.steps.length, 0);
  assert.equal(JSON.stringify(response.body).includes('Set up HTML basics'), false);
  assert.equal(JSON.stringify(response.body).includes('roadmapDraftTitle'), false);
});
