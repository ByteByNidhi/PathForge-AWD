const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const SavedOpportunity = require('../models/SavedOpportunity');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const { skillMatches, normalizeHaystack } = require('../services/opportunitySkillMatcher');
const { skillMatch } = require('../services/opportunitySkillMatch');
const { deadlineStatus, CLOSING_SOON_DAYS } = require('../services/opportunityStatus');
const { isVisibleToStudents } = require('../services/opportunityVisibility');
const {
  app,
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  authed,
} = require('./helpers');

function daysFromNow(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function createOpportunity(overrides = {}) {
  return Opportunity.create({
    title: overrides.title || `Opportunity ${Math.random().toString(36).slice(2, 8)}`,
    organization: overrides.organization || 'PathForge Test Org',
    type: overrides.type || 'Internship',
    description: overrides.description || 'Student hub fixture.',
    requiredSkills: Object.prototype.hasOwnProperty.call(overrides, 'requiredSkills')
      ? overrides.requiredSkills
      : 'JavaScript',
    eligibility: overrides.eligibility || 'Students welcome',
    deadline: Object.prototype.hasOwnProperty.call(overrides, 'deadline')
      ? overrides.deadline
      : daysFromNow(30),
    applicationUrl: Object.prototype.hasOwnProperty.call(overrides, 'applicationUrl')
      ? overrides.applicationUrl
      : 'https://example.com/apply',
    location: overrides.location || 'Remote',
    source: Object.prototype.hasOwnProperty.call(overrides, 'source') ? overrides.source : null,
    externalId: Object.prototype.hasOwnProperty.call(overrides, 'externalId')
      ? overrides.externalId
      : null,
    approvalStatus: overrides.approvalStatus || Opportunity.APPROVAL_APPROVED,
    createdAt: overrides.createdAt,
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

test('approved opportunity is visible', async () => {
  const opportunity = await createOpportunity({
    title: 'Approved Role',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
  });
  assert.equal(isVisibleToStudents(opportunity), true);

  const { token } = await createStudent();
  const response = await authed('get', '/api/opportunities', token).expect(200);
  assert.equal(response.body.opportunities.some((item) => item.title === 'Approved Role'), true);

  const detail = await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(200);
  assert.equal(detail.body.opportunity.title, 'Approved Role');
});

test('pending opportunity is not visible', async () => {
  const opportunity = await createOpportunity({
    title: 'Pending Role',
    approvalStatus: Opportunity.APPROVAL_PENDING,
  });
  assert.equal(isVisibleToStudents(opportunity), false);

  const { token } = await createStudent();
  const list = await authed('get', '/api/opportunities', token).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Pending Role'), false);
  await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(404);
});

test('rejected opportunity is not visible', async () => {
  const opportunity = await createOpportunity({
    title: 'Rejected Role',
    approvalStatus: Opportunity.APPROVAL_REJECTED,
  });
  assert.equal(isVisibleToStudents(opportunity), false);

  const { token } = await createStudent();
  const list = await authed('get', '/api/opportunities', token).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Rejected Role'), false);
  await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(404);
});

test('expired imported opportunity is not student-visible', async () => {
  const opportunity = await createOpportunity({
    title: 'Expired Imported Role',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
    deadline: daysFromNow(-1),
    source: Opportunity.SOURCE_HIMALAYAS,
    externalId: 'expired-imported',
  });
  assert.equal(isVisibleToStudents(opportunity), false);

  const { token } = await createStudent();
  const list = await authed('get', '/api/opportunities', token).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Expired Imported Role'), false);
  await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(404);
});

test('manual expired opportunity remains visible as closed', async () => {
  const opportunity = await createOpportunity({
    title: 'Manual Expired Role',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
    deadline: daysFromNow(-1),
    source: null,
  });
  assert.equal(isVisibleToStudents(opportunity), true);

  const { token } = await createStudent();
  const list = await authed('get', '/api/opportunities', token).expect(200);
  const found = list.body.opportunities.find((item) => item.title === 'Manual Expired Role');
  assert.ok(found);
  assert.equal(found.deadlineStatus, 'closed');

  const detail = await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(200);
  assert.equal(detail.body.opportunity.deadlineStatus, 'closed');
});

test('closing-soon calculation uses 14-day threshold', () => {
  assert.equal(CLOSING_SOON_DAYS, 14);
  assert.equal(deadlineStatus(daysFromNow(-1)), 'closed');
  assert.equal(deadlineStatus(daysFromNow(0)), 'closing_soon');
  assert.equal(deadlineStatus(daysFromNow(14)), 'closing_soon');
  assert.equal(deadlineStatus(daysFromNow(15)), 'open');
  assert.equal(deadlineStatus(null), 'open');
});

test('skill match percentage works', async () => {
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'javascript' });
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const opportunity = await createOpportunity({ requiredSkills: 'Python' });
  await OpportunitySkill.create({ opportunityId: opportunity._id, skillId: javascript._id });
  await OpportunitySkill.create({ opportunityId: opportunity._id, skillId: html._id });

  const { token, user } = await createStudent();
  await UserSkill.create({ user: user._id, skill: javascript._id });
  await UserSkill.create({ user: user._id, skill: html._id });

  const response = await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(200);
  assert.equal(response.body.opportunity.skillMatch.percent, 100);
  assert.deepEqual(response.body.opportunity.skillMatch.matched.sort(), ['HTML', 'JavaScript']);
});

test('no user skills returns null match', () => {
  const match = skillMatch([], ['JavaScript', 'HTML']);
  assert.equal(match.hasUserSkills, false);
  assert.equal(match.percent, null);
  assert.deepEqual(match.matched, []);
  assert.deepEqual(match.missing, ['JavaScript', 'HTML']);
});

test('no required skills returns null match', () => {
  const match = skillMatch(['JavaScript'], []);
  assert.equal(match.hasUserSkills, true);
  assert.equal(match.percent, null);
  assert.deepEqual(match.matched, []);
});

test('student skill matching does not use import aliases', () => {
  const cyber = skillMatch(['cybersecurity'], ['cyber security', 'Python']);
  assert.equal(cyber.percent, 0);
  assert.deepEqual(cyber.matched, []);
  assert.deepEqual(cyber.missing, ['cyber security', 'Python']);

  const spacedCyber = skillMatch(['Cyber Security'], ['cybersecurity']);
  assert.equal(spacedCyber.percent, 0);

  const ml = skillMatch(['Machine Learning'], ['machine learning']);
  assert.equal(ml.percent, 100);

  const ux = skillMatch(['UI UX'], ['UI/UX Design']);
  assert.equal(ux.percent, 0);

  const token = skillMatch(['JavaScript'], ['JavaScript Developer']);
  assert.equal(token.percent, 100);

  const noPartial = skillMatch(['Java'], ['JavaScript']);
  assert.equal(noPartial.percent, 0);
});

test('import skill matcher still uses catalogue aliases', () => {
  const haystack = normalizeHaystack(
    'JavaScript Developer using React and Laravel. Categories: JavaScript-Developer Web-Development'
  );
  assert.equal(skillMatches('JavaScript', haystack), true);
  assert.equal(skillMatches('React', haystack), true);
  assert.equal(skillMatches('Laravel', haystack), true);
  assert.equal(skillMatches('Cybersecurity', haystack), false);
  assert.equal(skillMatches('Cybersecurity', normalizeHaystack('Cyber security role')), true);
  assert.equal(skillMatches('UI/UX Design', normalizeHaystack('We need UI/UX designers')), true);
});

test('higher match sorts first', async () => {
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'javascript' });
  const html = await Skill.create({ name: 'HTML', slug: 'html' });
  const python = await Skill.create({ name: 'Python', slug: 'python' });

  const low = await createOpportunity({
    title: 'Low Match',
    requiredSkills: null,
  });
  const high = await createOpportunity({
    title: 'High Match',
    requiredSkills: null,
  });
  await Opportunity.findByIdAndUpdate(low._id, { createdAt: daysFromNow(1) });
  await Opportunity.findByIdAndUpdate(high._id, { createdAt: daysFromNow(0) });
  await OpportunitySkill.create({ opportunityId: low._id, skillId: html._id });
  await OpportunitySkill.create({ opportunityId: low._id, skillId: python._id });
  await OpportunitySkill.create({ opportunityId: high._id, skillId: javascript._id });
  await OpportunitySkill.create({ opportunityId: high._id, skillId: html._id });

  const { token, user } = await createStudent();
  await UserSkill.create({ user: user._id, skill: javascript._id });
  await UserSkill.create({ user: user._id, skill: html._id });

  const response = await authed('get', '/api/opportunities?sort=match', token).expect(200);
  const titles = response.body.opportunities.map((item) => item.title);
  assert.ok(titles.indexOf('High Match') < titles.indexOf('Low Match'));
  assert.equal(response.body.opportunities.find((item) => item.title === 'High Match').skillMatch.percent, 100);
  assert.equal(response.body.opportunities.find((item) => item.title === 'Low Match').skillMatch.percent, 50);
});

test('save works', async () => {
  const opportunity = await createOpportunity({ title: 'Save Role' });
  const { token, user } = await createStudent();

  const response = await authed('post', `/api/opportunities/${opportunity.id}/save`, token).expect(200);
  assert.equal(response.body.saved, true);
  assert.equal(await SavedOpportunity.countDocuments({ userId: user._id }), 1);
  const saved = await SavedOpportunity.findOne({ userId: user._id });
  assert.ok(saved.savedAt);
  assert.equal(String(saved.opportunityId), opportunity.id);
});

test('duplicate save is prevented', async () => {
  const opportunity = await createOpportunity({ title: 'Dup Save Role' });
  const { token, user } = await createStudent();

  await authed('post', `/api/opportunities/${opportunity.id}/save`, token).expect(200);
  await authed('post', `/api/opportunities/${opportunity.id}/save`, token).expect(200);
  assert.equal(await SavedOpportunity.countDocuments({ userId: user._id, opportunityId: opportunity._id }), 1);

  await assert.rejects(
    () =>
      SavedOpportunity.create({
        userId: user._id,
        opportunityId: opportunity._id,
        savedAt: new Date(),
      }),
    /E11000|duplicate/i
  );
});

test('unsave only affects current user', async () => {
  const opportunity = await createOpportunity({ title: 'Shared Save Role' });
  const owner = await createStudent({ email: `owner-${Date.now()}@example.com` });
  const other = await createStudent({ email: `other-${Date.now()}@example.com` });

  await authed('post', `/api/opportunities/${opportunity.id}/save`, owner.token).expect(200);
  await authed('post', `/api/opportunities/${opportunity.id}/save`, other.token).expect(200);
  assert.equal(await SavedOpportunity.countDocuments({ opportunityId: opportunity._id }), 2);

  await authed('delete', `/api/opportunities/${opportunity.id}/save`, other.token).expect(200);
  assert.equal(
    await SavedOpportunity.countDocuments({ userId: owner.user._id, opportunityId: opportunity._id }),
    1
  );
  assert.equal(
    await SavedOpportunity.countDocuments({ userId: other.user._id, opportunityId: opportunity._id }),
    0
  );
});

test('unauthenticated save is rejected', async () => {
  const opportunity = await createOpportunity();
  await request(app).post(`/api/opportunities/${opportunity.id}/save`).expect(401);
  await request(app).get('/api/opportunities').expect(401);
});

test('hub filters type, location, skill, search, and status', async () => {
  const javascript = await Skill.create({ name: 'JavaScript', slug: `js-filter-${Date.now()}` });
  const hackathon = await createOpportunity({
    title: 'Filter Hackathon',
    type: 'Hackathon',
    location: 'Bengaluru',
    requiredSkills: 'Python',
    deadline: daysFromNow(30),
  });
  const internship = await createOpportunity({
    title: 'Filter Internship',
    type: 'Internship',
    location: 'Remote',
    requiredSkills: null,
    deadline: daysFromNow(3),
  });
  await OpportunitySkill.create({ opportunityId: internship._id, skillId: javascript._id });
  await createOpportunity({
    title: 'Filter Closed Manual',
    type: 'Scholarship',
    location: 'Delhi',
    requiredSkills: 'Excel',
    deadline: daysFromNow(-2),
    source: null,
  });

  const { token } = await createStudent();

  const byType = await authed('get', '/api/opportunities?type=Hackathon', token).expect(200);
  assert.equal(byType.body.opportunities.every((item) => item.type === 'Hackathon'), true);
  assert.equal(byType.body.opportunities.some((item) => item.title === 'Filter Hackathon'), true);
  assert.equal(byType.body.opportunities.some((item) => item.title === 'Filter Internship'), false);

  const byLocation = await authed('get', '/api/opportunities?location=Remote', token).expect(200);
  assert.equal(byLocation.body.opportunities.every((item) => item.location === 'Remote'), true);
  assert.equal(byLocation.body.opportunities.some((item) => item.title === 'Filter Internship'), true);
  assert.equal(byLocation.body.opportunities.some((item) => item.title === hackathon.title), false);

  const bySkill = await authed('get', '/api/opportunities?skill=JavaScript', token).expect(200);
  assert.equal(bySkill.body.opportunities.some((item) => item.title === 'Filter Internship'), true);
  assert.equal(bySkill.body.opportunities.some((item) => item.title === 'Filter Hackathon'), false);

  const bySearch = await authed('get', '/api/opportunities?q=Filter%20Hackathon', token).expect(200);
  assert.equal(bySearch.body.opportunities.some((item) => item.title === 'Filter Hackathon'), true);
  assert.equal(bySearch.body.opportunities.some((item) => item.title === 'Filter Internship'), false);

  const closed = await authed('get', '/api/opportunities?status=closed', token).expect(200);
  assert.equal(closed.body.opportunities.every((item) => item.deadlineStatus === 'closed'), true);
  assert.equal(closed.body.opportunities.some((item) => item.title === 'Filter Closed Manual'), true);

  const closing = await authed('get', '/api/opportunities?status=closing_soon', token).expect(200);
  assert.equal(closing.body.opportunities.every((item) => item.deadlineStatus === 'closing_soon'), true);
  assert.equal(closing.body.opportunities.some((item) => item.title === 'Filter Internship'), true);

  const open = await authed('get', '/api/opportunities?status=open', token).expect(200);
  assert.equal(open.body.opportunities.every((item) => item.deadlineStatus === 'open'), true);
  assert.equal(open.body.opportunities.some((item) => item.title === 'Filter Hackathon'), true);
});

test('hub sorts by match, nearest, and latest deadline', async () => {
  await createOpportunity({
    title: 'Nearest Deadline',
    deadline: daysFromNow(2),
  });
  await createOpportunity({
    title: 'Later Deadline',
    deadline: daysFromNow(40),
  });
  await createOpportunity({
    title: 'Closed Manual Sort',
    deadline: daysFromNow(-3),
    source: null,
  });
  await createOpportunity({
    title: 'No Deadline Sort',
    deadline: null,
  });

  const { token } = await createStudent();

  const nearestSort = await authed('get', '/api/opportunities?sort=nearest', token).expect(200);
  const nearestTitles = nearestSort.body.opportunities.map((item) => item.title);
  assert.ok(nearestTitles.indexOf('Nearest Deadline') < nearestTitles.indexOf('Later Deadline'));
  assert.ok(nearestTitles.indexOf('Later Deadline') < nearestTitles.indexOf('No Deadline Sort'));
  assert.ok(nearestTitles.indexOf('No Deadline Sort') < nearestTitles.indexOf('Closed Manual Sort'));

  const latestSort = await authed('get', '/api/opportunities?sort=latest', token).expect(200);
  const latestTitles = latestSort.body.opportunities.map((item) => item.title);
  assert.equal(latestTitles[0], 'Later Deadline');
  assert.ok(latestTitles.indexOf('Later Deadline') < latestTitles.indexOf('Nearest Deadline'));
  assert.ok(latestTitles.indexOf('Nearest Deadline') < latestTitles.indexOf('Closed Manual Sort'));
  assert.ok(latestTitles.indexOf('No Deadline Sort') > latestTitles.indexOf('Closed Manual Sort'));
});

test('external applicationUrl is returned', async () => {
  const opportunity = await createOpportunity({
    title: 'Apply Role',
    applicationUrl: 'https://himalayas.app/companies/acme/jobs/apply-role',
    source: Opportunity.SOURCE_HIMALAYAS,
    externalId: 'apply-role',
  });
  const { token } = await createStudent();
  const response = await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(200);
  assert.equal(
    response.body.opportunity.applicationUrl,
    'https://himalayas.app/companies/acme/jobs/apply-role'
  );
  assert.equal(response.body.opportunity.hasValidApplicationUrl, true);
  assert.equal(response.body.opportunity.sourceLabel, 'Himalayas');
});

test('unsafe application URL is not exposed as an Apply link', async () => {
  const opportunity = await createOpportunity({
    title: 'Unsafe Apply Role',
    applicationUrl: 'javascript:alert(1)',
    source: null,
  });
  const { token } = await createStudent();
  const response = await authed('get', `/api/opportunities/${opportunity.id}`, token).expect(200);
  assert.equal(response.body.opportunity.hasValidApplicationUrl, false);
  assert.equal(response.body.opportunity.applicationUrl, null);
});

test('no application collection/model is created', () => {
  assert.equal(mongoose.modelNames().includes('Application'), false);
  assert.equal(Boolean(mongoose.models.Application), false);
  const collections = Object.keys(mongoose.connection.collections);
  assert.equal(collections.some((name) => name.toLowerCase().includes('application')), false);
});
