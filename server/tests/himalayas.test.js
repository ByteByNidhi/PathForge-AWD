const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const LearningPath = require('../models/LearningPath');
const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const Skill = require('../models/Skill');
const himalayasJobService = require('../services/himalayasJobService');
const { searchQueryForPath } = require('../services/opportunityImportService');
const { isVisibleToStudents } = require('../services/opportunityVisibility');
const {
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  createOrganizationOwner,
  createAdmin,
  authed,
} = require('./helpers');

function daysFromNow(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function unixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function sampleJob(overrides = {}) {
  return {
    guid: overrides.guid || 'pf-test-guid-js',
    title: overrides.title || 'JavaScript Developer',
    excerpt: 'A remote JavaScript role using React.',
    companyName: overrides.companyName || 'Acme Labs',
    employmentType: Object.prototype.hasOwnProperty.call(overrides, 'employmentType')
      ? overrides.employmentType
      : 'Full Time',
    minSalary: 50000,
    maxSalary: 70000,
    salaryPeriod: 'annual',
    seniority: ['Mid-level'],
    currency: 'USD',
    locationRestrictions: ['India'],
    categories: ['JavaScript-Developer', 'React'],
    parentCategories: ['Developer'],
    description: overrides.description || 'Build product features with JavaScript and React.',
    pubDate: unixSeconds(new Date()),
    expiryDate: Object.prototype.hasOwnProperty.call(overrides, 'expiryDate')
      ? overrides.expiryDate
      : unixSeconds(daysFromNow(30)),
    applicationLink: Object.prototype.hasOwnProperty.call(overrides, 'applicationLink')
      ? overrides.applicationLink
      : 'https://himalayas.app/companies/acme/jobs/javascript-dev',
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function mockJobs(jobs, inspect) {
  himalayasJobService.fetchImpl = async (url) => {
    if (inspect) {
      inspect(String(url));
    }
    return jsonResponse({ jobs });
  };
}

before(async () => {
  await startTestDb();
});

after(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  himalayasJobService.fetchImpl = null;
});

afterEach(() => {
  himalayasJobService.fetchImpl = null;
  delete process.env.HIMALAYAS_API_TIMEOUT;
});

test('successful fetch imports jobs as pending himalayas records', async () => {
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'javascript' });
  await Skill.create({ name: 'Cybersecurity', slug: 'cybersecurity' });
  const { token } = await createAdmin();
  mockJobs([sampleJob()]);

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.fetched, 1);
  assert.equal(response.body.imported, 1);
  assert.equal(response.body.skippedDuplicates, 0);

  const opportunity = await Opportunity.findOne({ externalId: 'pf-test-guid-js' });
  assert.ok(opportunity);
  assert.equal(opportunity.title, 'JavaScript Developer');
  assert.equal(opportunity.organization, 'Acme Labs');
  assert.equal(opportunity.source, Opportunity.SOURCE_HIMALAYAS);
  assert.equal(opportunity.externalId, 'pf-test-guid-js');
  assert.equal(opportunity.sourceUrl, 'https://himalayas.app/companies/acme/jobs/javascript-dev');
  assert.equal(opportunity.applicationUrl, 'https://himalayas.app/companies/acme/jobs/javascript-dev');
  assert.equal(opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
  assert.ok(opportunity.deadline);
  assert.equal(
    opportunity.deadline.getFullYear() === daysFromNow(30).getFullYear() &&
      opportunity.deadline.getMonth() === daysFromNow(30).getMonth() &&
      opportunity.deadline.getDate() === daysFromNow(30).getDate(),
    true
  );

  const linked = await OpportunitySkill.find({ opportunityId: opportunity._id }).populate('skillId');
  assert.equal(linked.some((row) => row.skillId && String(row.skillId._id) === String(javascript._id)), true);
  assert.equal(linked.some((row) => row.skillId && row.skillId.name === 'Cybersecurity'), false);
  assert.match(String(opportunity.requiredSkills), /JavaScript/);
});

test('duplicate GUID is not imported twice', async () => {
  const { token } = await createAdmin();
  mockJobs([sampleJob()]);

  await authed('post', '/api/admin/opportunities/himalayas/fetch', token).send({ query: 'javascript' }).expect(200);
  const second = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(200);

  assert.equal(second.body.imported, 0);
  assert.equal(second.body.skippedDuplicates, 1);
  assert.equal(await Opportunity.countDocuments({ externalId: 'pf-test-guid-js' }), 1);
});

test('duplicate application URL is not imported twice', async () => {
  const { token } = await createAdmin();
  await Opportunity.create({
    title: 'Existing Apply URL',
    organization: 'Acme',
    type: 'Internship',
    applicationUrl: 'https://himalayas.app/companies/acme/jobs/javascript-dev',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
  });
  mockJobs([sampleJob({ guid: 'different-guid' })]);

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(200);

  assert.equal(response.body.imported, 0);
  assert.equal(response.body.skippedDuplicates, 1);
  assert.equal(await Opportunity.countDocuments(), 1);
});

test('learning path query uses path name, up to 4 skills, and Development to developer', async () => {
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'javascript-lp' });
  const html = await Skill.create({ name: 'HTML', slug: 'html-lp' });
  const css = await Skill.create({ name: 'CSS', slug: 'css-lp' });
  const react = await Skill.create({ name: 'React', slug: 'react-lp' });
  const extra = await Skill.create({ name: 'Python', slug: 'python-lp' });
  const path = await LearningPath.create({
    pathName: 'Web Development',
    title: 'Web Development',
    slug: 'web-development',
    skills: [javascript._id, html._id, css._id, react._id, extra._id],
  });
  const populated = await LearningPath.findById(path._id).populate('skills');
  const derived = searchQueryForPath(populated);
  assert.match(derived, /^Web developer /);
  assert.doesNotMatch(derived, /Development/);
  assert.match(derived, /JavaScript/);
  assert.match(derived, /HTML/);
  assert.match(derived, /CSS/);
  assert.match(derived, /React/);
  assert.doesNotMatch(derived, /Python/);

  const { token } = await createAdmin();
  let requested;
  mockJobs([sampleJob({ guid: 'pf-test-guid-path', title: 'Frontend JavaScript Engineer' })], (url) => {
    requested = new URL(url);
  });

  await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ learningPathId: String(path._id) })
    .expect(200);

  assert.equal(requested.searchParams.get('q'), derived);
  const stored = await Opportunity.findOne({ externalId: 'pf-test-guid-path' });
  assert.ok(stored);
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_PENDING);
});

test('country parameter is passed to the Himalayas API', async () => {
  const { token } = await createAdmin();
  let requested;
  mockJobs([sampleJob()], (url) => {
    requested = new URL(url);
  });

  await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript', country: 'India' })
    .expect(200);

  assert.equal(requested.searchParams.get('country'), 'India');
  assert.equal(requested.searchParams.get('q'), 'javascript');
  assert.match(requested.href, /himalayas\.app\/jobs\/api\/search/);
});

test('malformed API response is handled', async () => {
  const { token } = await createAdmin();
  himalayasJobService.fetchImpl = async () => jsonResponse({ error: 'nope' });

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(502);

  assert.equal(response.body.message, himalayasJobService.MESSAGES.invalid);
  assert.equal(await Opportunity.countDocuments(), 0);
});

test('connection failure is handled', async () => {
  const { token } = await createAdmin();
  himalayasJobService.fetchImpl = async () => {
    throw new TypeError('fetch failed');
  };

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(503);

  assert.equal(response.body.message, himalayasJobService.MESSAGES.connection);
  assert.equal(await Opportunity.countDocuments(), 0);
});

test('timeout is handled', async () => {
  const { token } = await createAdmin();
  process.env.HIMALAYAS_API_TIMEOUT = '0.05';
  himalayasJobService.fetchImpl = (_url, options) =>
    new Promise((_resolve, reject) => {
      const abort = () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (options.signal.aborted) {
        abort();
        return;
      }
      options.signal.addEventListener('abort', abort);
    });

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(503);

  assert.equal(response.body.message, himalayasJobService.MESSAGES.connection);
});

test('429 rate limit is handled', async () => {
  const { token } = await createAdmin();
  himalayasJobService.fetchImpl = async () => jsonResponse('Too Many Requests', 429);

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(429);

  assert.equal(response.body.message, himalayasJobService.MESSAGES.rateLimit);
});

test('5xx error is handled', async () => {
  const { token } = await createAdmin();
  himalayasJobService.fetchImpl = async () => jsonResponse({ error: 'nope' }, 500);

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', token)
    .send({ query: 'javascript' })
    .expect(503);

  assert.equal(response.body.message, himalayasJobService.MESSAGES.server);
});

test('unsafe application URL with a GUID is still imported', async () => {
  await Skill.create({ name: 'JavaScript', slug: 'javascript-dup' });
  const skillCount = await Skill.countDocuments();
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();
  mockJobs([
    sampleJob({
      guid: 'bad-url-job',
      applicationLink: 'javascript:alert(1)',
    }),
    sampleJob({ guid: 'good-url-job', applicationLink: 'https://himalayas.app/jobs/good' }),
  ]);

  const response = await authed('post', '/api/admin/opportunities/himalayas/fetch', adminToken)
    .send({ query: 'javascript' })
    .expect(200);

  assert.equal(response.body.imported, 2);
  assert.equal(await Opportunity.countDocuments({ externalId: 'bad-url-job' }), 1);
  assert.equal(await Opportunity.countDocuments({ externalId: 'good-url-job' }), 1);
  assert.equal(await Skill.countDocuments(), skillCount);

  const unsafe = await Opportunity.findOne({ externalId: 'bad-url-job' });
  assert.equal(unsafe.applicationUrl, 'javascript:alert(1)');
  assert.equal(unsafe.approvalStatus, Opportunity.APPROVAL_PENDING);

  await authed('post', `/api/admin/opportunities/${unsafe.id}/approve`, adminToken).expect(200);
  const studentView = await authed('get', `/api/opportunities/${unsafe.id}`, studentToken).expect(200);
  assert.equal(studentView.body.opportunity.hasValidApplicationUrl, false);
  assert.equal(studentView.body.opportunity.applicationUrl, null);
});

test('Himalayas imports are not subjected to the 2-year admin deadline cap', async () => {
  const { token } = await createAdmin();
  const far = daysFromNow(800);
  mockJobs([
    sampleJob({
      guid: 'far-deadline',
      expiryDate: unixSeconds(far),
      applicationLink: 'https://himalayas.app/jobs/far',
    }),
  ]);

  await authed('post', '/api/admin/opportunities/himalayas/fetch', token).send({ query: 'javascript' }).expect(200);

  const stored = await Opportunity.findOne({ externalId: 'far-deadline' });
  assert.ok(stored);
  assert.ok(stored.deadline > daysFromNow(700));
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_PENDING);
});

test('pending, rejected, and expired Himalayas opportunities are hidden from students', async () => {
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();
  mockJobs([sampleJob({ guid: 'visibility-job' })]);
  await authed('post', '/api/admin/opportunities/himalayas/fetch', adminToken).send({ query: 'javascript' }).expect(200);
  const pending = await Opportunity.findOne({ externalId: 'visibility-job' });
  assert.equal(isVisibleToStudents(pending), false);

  let hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.externalId === 'visibility-job'), false);
  await authed('get', `/api/opportunities/${pending.id}`, studentToken).expect(404);

  await authed('post', `/api/admin/opportunities/${pending.id}/approve`, adminToken).expect(200);
  assert.equal(isVisibleToStudents(await Opportunity.findById(pending.id)), true);
  hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.externalId === 'visibility-job'), true);

  pending.deadline = daysFromNow(-1);
  pending.approvalStatus = Opportunity.APPROVAL_APPROVED;
  await pending.save();
  assert.equal(isVisibleToStudents(await Opportunity.findById(pending.id)), false);
  hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.externalId === 'visibility-job'), false);

  pending.deadline = daysFromNow(20);
  pending.approvalStatus = Opportunity.APPROVAL_REJECTED;
  await pending.save();
  assert.equal(isVisibleToStudents(await Opportunity.findById(pending.id)), false);
  hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.externalId === 'visibility-job'), false);
});

test('only admins can trigger Himalayas ingestion', async () => {
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();
  const { token: orgToken } = await createOrganizationOwner();
  mockJobs([sampleJob({ guid: 'auth-job' })]);

  await authed('post', '/api/admin/opportunities/himalayas/fetch', studentToken)
    .send({ query: 'javascript' })
    .expect(403);
  await authed('post', '/api/admin/opportunities/himalayas/fetch', orgToken)
    .send({ query: 'javascript' })
    .expect(403);
  await authed('post', '/api/admin/opportunities/himalayas/fetch', adminToken)
    .send({ query: 'javascript' })
    .expect(200);

  assert.equal(await Opportunity.countDocuments({ externalId: 'auth-job' }), 1);
});
