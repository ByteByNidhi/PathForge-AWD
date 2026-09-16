const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const env = require('../config/env');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const UserProgress = require('../models/UserProgress');
const geminiService = require('../services/geminiService');
const {
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  createAdmin,
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

function validPayload(skills) {
  const primary = skills[0] || 'HTML';
  const secondary = skills[1] || primary;
  const steps = [];
  for (let i = 1; i <= 8; i += 1) {
    steps.push({
      title: i === 1 ? 'Set up HTML basics' : `Foundation step ${i}`,
      description: `Complete a practical beginner task for step ${i} of this career path.`,
      xp_reward: 10,
      skills: [i % 2 === 0 ? secondary : primary],
    });
  }
  return {
    title: 'AI Web Foundations',
    description: 'A complete foundation roadmap generated for tests.',
    steps,
  };
}

function fakeGeminiJson(payload) {
  configureGemini();
  let captured;
  geminiService.setFetchImpl(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
        };
      },
    };
  });
  return () => captured;
}

async function makePathWithSkills(skillNames) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = await LearningPath.create({
    title: `PF AI Roadmap Test ${suffix}`,
    pathName: `PF AI Roadmap Test ${suffix}`,
    slug: `pf-ai-roadmap-${suffix}`,
    description: 'Isolated path for AI roadmap tests.',
    roadmapSource: LearningPath.SOURCE_CURATED,
  });

  const skillIds = [];
  const catalogNames = skillNames.length ? skillNames : ['HTML', 'Git'];
  for (const name of catalogNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const skill =
      (await Skill.findOne({ name })) || (await Skill.create({ name, slug }));
    if (skillNames.includes(name)) {
      skillIds.push(skill._id);
    }
  }
  if (skillIds.length) {
    path.skills = skillIds;
    await path.save();
  }
  return path;
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

test('successful Gemini roadmap generation persists unpublished steps', async () => {
  const getCapture = fakeGeminiJson(validPayload(['HTML', 'Git']));
  const path = await makePathWithSkills(['HTML', 'Git']);
  const { token } = await createAdmin();

  const response = await authed('post', `/api/admin/roadmaps/${path.id}/generate`, token)
    .send({ beginner: 0 })
    .expect(200);

  const refreshed = await LearningPath.findById(path.id);
  const drafts = await RoadmapStep.find({ pathId: path._id, isPublished: false }).sort({ stepNo: 1 });
  assert.equal(drafts.length, 8);
  assert.equal(refreshed.roadmapDraftTitle, 'AI Web Foundations');
  assert.ok(refreshed.roadmapGeneratedAt);
  assert.equal(refreshed.roadmapSource, LearningPath.SOURCE_CURATED);
  assert.ok(drafts.every((step) => step.isPublished === false));
  assert.equal(drafts[0].title, 'Set up HTML basics');
  await drafts[0].populate('skills');
  assert.deepEqual(drafts[0].skills.map((skill) => skill.name), ['HTML']);
  assert.equal(response.body.draftSteps.length, 8);

  const captured = getCapture();
  assert.equal(captured.body.generationConfig.responseMimeType, 'application/json');
  assert.match(captured.body.contents[0].parts[0].text, new RegExp(path.pathName));
  assert.match(captured.body.contents[0].parts[0].text, /HTML/);
  assert.match(captured.body.systemInstruction.parts[0].text, /STRICT JSON/);
});

test('malformed Gemini response is rejected', async () => {
  geminiService.setFetchImpl(async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        candidates: [{ content: { parts: [{ text: 'Here is a roadmap but not JSON.' }] } }],
      };
    },
  }));

  const path = await makePathWithSkills(['HTML']);
  const { token } = await createAdmin();
  const response = await authed('post', `/api/admin/roadmaps/${path.id}/generate`, token).expect(422);
  assert.match(response.body.message, /valid JSON/);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false }), 0);
});

test('unknown skill from Gemini is rejected', async () => {
  const payload = validPayload(['HTML']);
  payload.steps[0].skills = ['Quantum Baking 9000'];
  fakeGeminiJson(payload);
  const path = await makePathWithSkills(['HTML']);
  const { token } = await createAdmin();

  const response = await authed('post', `/api/admin/roadmaps/${path.id}/generate`, token).expect(422);
  assert.match(response.body.message, /Quantum Baking 9000/);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false }), 0);
  assert.equal(await Skill.exists({ name: 'Quantum Baking 9000' }), null);
});

test('publish workflow writes live steps and metadata', async () => {
  fakeGeminiJson(validPayload(['HTML', 'Git']));
  const path = await makePathWithSkills(['HTML', 'Git']);
  const { token } = await createAdmin();

  await authed('post', `/api/admin/roadmaps/${path.id}/generate`, token).expect(200);
  const preview = await authed('get', `/api/admin/roadmaps/${path.id}/preview`, token).expect(200);
  assert.ok(preview.body.draftSteps.some((step) => step.title === 'Set up HTML basics'));

  await authed('post', `/api/admin/roadmaps/${path.id}/publish`, token).expect(200);
  const refreshed = await LearningPath.findById(path.id);
  assert.equal(refreshed.roadmapSource, LearningPath.SOURCE_AI);
  assert.equal(refreshed.roadmapDraftTitle, null);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false }), 0);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, isPublished: true }), 8);
  const first = await RoadmapStep.findOne({ pathId: path._id, isPublished: true }).sort({ stepNo: 1 });
  assert.equal(first.title, 'Set up HTML basics');
  assert.equal(first.isPublished, true);
});

test('unpublished AI draft is hidden from students', async () => {
  fakeGeminiJson(validPayload(['HTML', 'Git']));
  const path = await makePathWithSkills(['HTML', 'Git']);
  const admin = await createAdmin();
  const student = await createStudent();

  await authed('post', `/api/admin/roadmaps/${path.id}/generate`, admin.token).expect(200);

  const studentView = await authed('get', `/api/learning-paths/${path.id}/roadmap`, student.token).expect(200);
  assert.equal(studentView.body.steps.length, 0);
  assert.equal(JSON.stringify(studentView.body).includes('Set up HTML basics'), false);
  assert.equal(JSON.stringify(studentView.body).includes('Generate with AI'), false);

  await authed('post', `/api/admin/roadmaps/${path.id}/publish`, admin.token).expect(200);
  const live = await authed('get', `/api/learning-paths/${path.id}/roadmap`, student.token).expect(200);
  assert.ok(live.body.steps.some((step) => step.title === 'Set up HTML basics'));
});

test('existing user progress blocks destructive publish', async () => {
  fakeGeminiJson(validPayload(['HTML', 'Git']));
  const path = await makePathWithSkills(['HTML', 'Git']);
  const admin = await createAdmin();
  const live = await RoadmapStep.create({
    pathId: path._id,
    stepNo: 1,
    title: 'Keep this live step',
    description: 'Students already started this.',
    xpReward: 10,
    isPublished: true,
  });
  const student = await createStudent({ learningPath: path._id });
  await UserProgress.create({
    userId: student.user._id,
    roadmapStepId: live._id,
    status: 'completed',
    completedAt: new Date(),
  });

  await authed('post', `/api/admin/roadmaps/${path.id}/generate`, admin.token).expect(200);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false }), 8);
  assert.ok(await RoadmapStep.findById(live._id));

  const blocked = await authed('post', `/api/admin/roadmaps/${path.id}/publish`, admin.token).expect(409);
  assert.match(blocked.body.message, /already has user progress/);
  const stillLive = await RoadmapStep.findById(live._id);
  assert.equal(stillLive.title, 'Keep this live step');
  assert.equal(stillLive.isPublished, true);
  assert.equal(
    await UserProgress.countDocuments({ userId: student.user._id, roadmapStepId: live._id }),
    1
  );
  const refreshed = await LearningPath.findById(path.id);
  assert.equal(refreshed.roadmapSource, LearningPath.SOURCE_CURATED);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false }), 8);
});

test('beginner path without skills requests a foundation roadmap', async () => {
  const getCapture = fakeGeminiJson(validPayload(['HTML', 'Git']));
  const path = await makePathWithSkills([]);
  const { token } = await createAdmin();
  await authed('post', `/api/admin/roadmaps/${path.id}/generate`, token).expect(200);
  assert.ok((await RoadmapStep.countDocuments({ pathId: path._id, isPublished: false })) >= 8);
  const captured = getCapture();
  assert.match(captured.body.systemInstruction.parts[0].text, /beginner/i);
  assert.match(captured.body.contents[0].parts[0].text, /BEGINNER \/ NO-SKILLS CASE/);
  assert.match(captured.body.contents[0].parts[0].text, /complete foundation/i);
});

test('students cannot trigger generation or manage steps', async () => {
  const path = await makePathWithSkills(['HTML']);
  const { token } = await createStudent();
  let called = false;
  geminiService.setFetchImpl(async () => {
    called = true;
    return { ok: true, json: async () => ({}) };
  });

  await authed('get', '/api/admin/roadmaps', token).expect(403);
  await authed('post', `/api/admin/roadmaps/${path.id}/generate`, token).expect(403);
  await authed('post', `/api/admin/roadmaps/${path.id}/steps`, token)
    .send({ stepNo: 1, title: 'Nope', xpReward: 10 })
    .expect(403);
  assert.equal(called, false);
  assert.equal(await RoadmapStep.countDocuments({ pathId: path._id }), 0);
});

test('admin can create edit and delete published steps with validation', async () => {
  const path = await makePathWithSkills(['HTML']);
  const { token } = await createAdmin();

  const invalid = await authed('post', `/api/admin/roadmaps/${path.id}/steps`, token)
    .send({ stepNo: 0, title: '', xpReward: -1 })
    .expect(422);
  assert.ok(invalid.body.errors.length);

  const created = await authed('post', `/api/admin/roadmaps/${path.id}/steps`, token)
    .send({ stepNo: 1, title: 'HTML Fundamentals', xpReward: 20 })
    .expect(201);
  assert.equal(created.body.step.isPublished, true);
  const stepId = created.body.step.id;

  await authed('put', `/api/admin/roadmaps/${path.id}/steps/${stepId}`, token)
    .send({ stepNo: 2, title: 'CSS Basics', xpReward: 25 })
    .expect(200);

  const other = await makePathWithSkills([]);
  await authed('put', `/api/admin/roadmaps/${other.id}/steps/${stepId}`, token)
    .send({ stepNo: 1, title: 'Stolen', xpReward: 10 })
    .expect(404);

  await authed('get', '/api/admin/roadmaps/not-a-real-id', token).expect(404);

  await authed('delete', `/api/admin/roadmaps/${path.id}/steps/${stepId}`, token).expect(200);
  assert.equal(await RoadmapStep.countDocuments({ _id: stepId }), 0);
});

test('admin users and demo subscriptions are admin-only', async () => {
  const admin = await createAdmin();
  const student = await createStudent({ name: 'Listed Student' });

  const users = await authed('get', '/api/admin/users', admin.token).expect(200);
  assert.ok(users.body.users.some((row) => row.email === student.user.email));

  const detail = await authed('get', `/api/admin/users/${student.user.id}`, admin.token).expect(200);
  assert.equal(detail.body.user.name, 'Listed Student');

  await authed('get', '/api/admin/users', student.token).expect(403);

  const list = await authed('get', '/api/admin/subscriptions', admin.token).expect(200);
  assert.equal(list.body.demo, true);
  assert.equal(list.body.subscriptions.length, 4);
  assert.equal(list.body.summary.total, 4);

  const show = await authed('get', '/api/admin/subscriptions/demo-sub-1', admin.token).expect(200);
  assert.equal(show.body.subscription.paymentMethod, 'Demo / Not Connected');

  const upgrade = await authed('post', '/api/admin/subscriptions/demo-sub-1/upgrade', admin.token).expect(
    200
  );
  assert.match(upgrade.body.message, /demonstration control only/);

  await authed('get', '/api/admin/subscriptions/missing', admin.token).expect(404);
  await authed('get', '/api/admin/subscriptions', student.token).expect(403);
});
