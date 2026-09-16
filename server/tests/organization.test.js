const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const Skill = require('../models/Skill');
const { isVisibleToStudents } = require('../services/opportunityVisibility');
const {
  startTestDb,
  stopTestDb,
  clearTestDb,
  createStudent,
  createOrganizationOwner,
  addOrganizationMember,
  authed,
} = require('./helpers');
const OrganizationUser = require('../models/OrganizationUser');

function daysFromNow(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function opportunityPayload(overrides = {}) {
  return {
    title: overrides.title || 'Org Draft Role',
    type: overrides.type || 'Internship',
    description: overrides.description || 'Organization-created listing for tests.',
    location: overrides.location || 'Remote',
    deadline: Object.prototype.hasOwnProperty.call(overrides, 'deadline')
      ? overrides.deadline
      : dateOnly(daysFromNow(30)),
    applicationUrl: Object.prototype.hasOwnProperty.call(overrides, 'applicationUrl')
      ? overrides.applicationUrl
      : 'https://example.com/org-apply',
    eligibility: overrides.eligibility || 'Students welcome',
    skillIds: Object.prototype.hasOwnProperty.call(overrides, 'skillIds') ? overrides.skillIds : [],
    intent: overrides.intent || 'draft',
    ...overrides,
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
});

test('organization user can access organization dashboard', async () => {
  const { organization, token } = await createOrganizationOwner();
  const response = await authed('get', '/api/organization', token).expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.organization.name, organization.name);
  assert.equal(response.body.stats.total, 0);
  assert.equal(response.body.permissions.isOwner, true);
});

test('normal student cannot access organization panel', async () => {
  const { token } = await createStudent();
  await authed('get', '/api/organization', token).expect(403);
  await authed('get', '/api/organization/profile', token).expect(403);
  await authed('get', '/api/organization/members', token).expect(403);
  await authed('get', '/api/organization/opportunities', token).expect(403);
});

test('organization user can view own organization', async () => {
  const { organization, token } = await createOrganizationOwner({
    orgName: 'Visible Collective',
    slug: `visible-${Date.now()}`,
  });
  const profile = await authed('get', '/api/organization/profile', token).expect(200);
  assert.equal(profile.body.organization.name, 'Visible Collective');
  assert.equal(profile.body.organization.slug, organization.slug);
  assert.equal(profile.body.organization.status, 'active');

  const members = await authed('get', '/api/organization/members', token).expect(200);
  assert.equal(members.body.members.length, 1);
  assert.equal(members.body.members[0].role, 'owner');
});

test('organization user cannot access another organization', async () => {
  const orgA = await createOrganizationOwner({ orgName: 'Alpha Org', slug: `alpha-${Date.now()}` });
  const orgB = await createOrganizationOwner({ orgName: 'Beta Org', slug: `beta-${Date.now()}` });

  const created = await authed('post', '/api/organization/opportunities', orgB.token)
    .send(opportunityPayload({ title: 'Beta Secret Role' }))
    .expect(201);

  const secretId = created.body.opportunity.id;
  await authed('get', `/api/organization/opportunities/${secretId}`, orgA.token).expect(403);

  const own = await authed('get', '/api/organization', orgA.token).expect(200);
  assert.equal(own.body.organization.name, 'Alpha Org');
  assert.equal(
    own.body.recent.some((item) => item.title === 'Beta Secret Role'),
    false
  );
});

test('organization can create opportunity and it starts as draft', async () => {
  const { organization, user, token } = await createOrganizationOwner();
  const skill = await Skill.create({ name: 'JavaScript', slug: 'javascript' });

  const response = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'New Org Draft', skillIds: [skill.id] }))
    .expect(201);

  assert.equal(response.body.opportunity.approvalStatus, Opportunity.APPROVAL_DRAFT);
  assert.equal(response.body.opportunity.source, Opportunity.SOURCE_ORGANIZATION);
  assert.equal(String(response.body.opportunity.organizationId), String(organization._id));
  assert.equal(String(response.body.opportunity.submittedByUserId), String(user._id));
  assert.equal(response.body.opportunity.organization, organization.name);
  assert.equal(response.body.opportunity.requiredSkills, 'JavaScript');

  const stored = await Opportunity.findById(response.body.opportunity.id);
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_DRAFT);
});

test('organization can edit a permitted opportunity', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Editable Draft' }))
    .expect(201);

  const updated = await authed('patch', `/api/organization/opportunities/${created.body.opportunity.id}`, token)
    .send(opportunityPayload({ title: 'Editable Draft Updated', intent: 'draft' }))
    .expect(200);

  assert.equal(updated.body.opportunity.title, 'Editable Draft Updated');
  assert.equal(updated.body.opportunity.approvalStatus, Opportunity.APPROVAL_DRAFT);
});

test('organization can delete a permitted draft opportunity', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Delete Me' }))
    .expect(201);

  await authed('delete', `/api/organization/opportunities/${created.body.opportunity.id}`, token).expect(200);
  assert.equal(await Opportunity.findById(created.body.opportunity.id), null);
});

test('organization can submit a draft and it becomes pending', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Submit Me' }))
    .expect(201);

  const submitted = await authed(
    'post',
    `/api/organization/opportunities/${created.body.opportunity.id}/submit`,
    token
  ).expect(200);

  assert.equal(submitted.body.opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
  const stored = await Opportunity.findById(created.body.opportunity.id);
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_PENDING);
});

test('pending opportunity remains invisible to students', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Pending Hidden Role', intent: 'submit' }))
    .expect(201);

  assert.equal(created.body.opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
  const stored = await Opportunity.findById(created.body.opportunity.id);
  assert.equal(isVisibleToStudents(stored), false);

  const { token: studentToken } = await createStudent();
  const list = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Pending Hidden Role'), false);
  await authed('get', `/api/opportunities/${created.body.opportunity.id}`, studentToken).expect(404);
});

test('rejected opportunity remains invisible and can be resubmitted', async () => {
  const { organization, user, token } = await createOrganizationOwner();
  const opportunity = await Opportunity.create({
    title: 'Rejected Org Role',
    organization: organization.name,
    type: 'Internship',
    description: 'Needs work.',
    location: 'Remote',
    source: Opportunity.SOURCE_ORGANIZATION,
    approvalStatus: Opportunity.APPROVAL_REJECTED,
    organizationId: organization._id,
    submittedByUserId: user._id,
    rejectionReason: 'Needs a clearer description.',
    deadline: daysFromNow(20),
    applicationUrl: 'https://example.com/org-apply',
  });

  assert.equal(isVisibleToStudents(opportunity), false);
  const { token: studentToken } = await createStudent();
  const list = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Rejected Org Role'), false);

  const detail = await authed('get', `/api/organization/opportunities/${opportunity.id}`, token).expect(200);
  assert.equal(detail.body.opportunity.rejectionReason, 'Needs a clearer description.');

  const resubmitted = await authed('post', `/api/organization/opportunities/${opportunity.id}/submit`, token).expect(
    200
  );
  assert.equal(resubmitted.body.opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
  assert.equal(resubmitted.body.opportunity.rejectionReason, null);
  assert.equal(String(resubmitted.body.opportunity.id), String(opportunity.id));
  assert.equal(isVisibleToStudents(await Opportunity.findById(opportunity.id)), false);
});

test('organization cannot approve its own opportunity', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Cannot Self Approve' }))
    .expect(201);

  await authed('post', `/api/organization/opportunities/${created.body.opportunity.id}/approve`, token).expect(404);
  await authed('post', `/api/admin/opportunities/${created.body.opportunity.id}/approve`, token).expect(403);

  const attempted = await authed(
    'patch',
    `/api/organization/opportunities/${created.body.opportunity.id}`,
    token
  )
    .send(
      opportunityPayload({
        title: 'Cannot Self Approve',
        approvalStatus: Opportunity.APPROVAL_APPROVED,
      })
    )
    .expect(400);

  assert.match(attempted.body.message, /approval status/i);
  const stored = await Opportunity.findById(created.body.opportunity.id);
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_DRAFT);
});

test('organization cannot edit or delete another organization opportunity', async () => {
  const orgA = await createOrganizationOwner({ slug: `edit-a-${Date.now()}` });
  const orgB = await createOrganizationOwner({ slug: `edit-b-${Date.now()}` });
  const created = await authed('post', '/api/organization/opportunities', orgB.token)
    .send(opportunityPayload({ title: 'Beta Owned Draft' }))
    .expect(201);

  await authed('patch', `/api/organization/opportunities/${created.body.opportunity.id}`, orgA.token)
    .send(opportunityPayload({ title: 'Hijacked Title' }))
    .expect(403);

  await authed('delete', `/api/organization/opportunities/${created.body.opportunity.id}`, orgA.token).expect(403);

  const stored = await Opportunity.findById(created.body.opportunity.id);
  assert.equal(stored.title, 'Beta Owned Draft');
});

test('deadline cannot be beyond 1 year', async () => {
  const { token } = await createOrganizationOwner();
  const response = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Far Deadline', deadline: dateOnly(daysFromNow(400)) }))
    .expect(400);
  assert.match(response.body.message, /1 year/i);
});

test('organization deadline cannot be in the past and today is accepted', async () => {
  const { token } = await createOrganizationOwner();
  const yesterday = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Yesterday Deadline', deadline: dateOnly(daysFromNow(-1)) }))
    .expect(400);
  assert.match(yesterday.body.message, /today or later/i);

  const today = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Today Deadline', deadline: dateOnly(daysFromNow(0)) }))
    .expect(201);
  assert.equal(today.body.opportunity.title, 'Today Deadline');

  const valid = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Six Month Deadline', deadline: dateOnly(daysFromNow(180)) }))
    .expect(201);
  assert.equal(valid.body.opportunity.title, 'Six Month Deadline');
});

test('invalid application URL is rejected', async () => {
  const { token } = await createOrganizationOwner();
  const response = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Bad URL', applicationUrl: 'not-a-url' }))
    .expect(400);
  assert.match(response.body.message, /http or https/i);
});

test('skill associations are persisted correctly', async () => {
  const { token } = await createOrganizationOwner();
  const javascript = await Skill.create({ name: 'JavaScript', slug: 'javascript' });
  const html = await Skill.create({ name: 'HTML', slug: 'html' });

  const created = await authed('post', '/api/organization/opportunities', token)
    .send(
      opportunityPayload({
        title: 'Skill Linked Role',
        skillIds: [javascript.id, javascript.id, html.id],
      })
    )
    .expect(201);

  const links = await OpportunitySkill.find({ opportunityId: created.body.opportunity.id });
  assert.equal(links.length, 2);
  assert.equal(created.body.opportunity.skills.map((item) => item.name).sort().join(','), 'HTML,JavaScript');
  assert.equal(created.body.opportunity.requiredSkills, 'HTML, JavaScript');
});

test('existing student Opportunity Hub still works', async () => {
  const approved = await Opportunity.create({
    title: 'Student Hub Listing',
    organization: 'PathForge Test Org',
    type: 'Internship',
    description: 'Still visible after organization workflow.',
    requiredSkills: 'Git',
    applicationUrl: 'https://example.com/manual-apply',
    location: 'Remote',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
    deadline: daysFromNow(21),
  });

  const { token } = await createStudent();
  const list = await authed('get', '/api/opportunities', token).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Student Hub Listing'), true);
  const detail = await authed('get', `/api/opportunities/${approved.id}`, token).expect(200);
  assert.equal(detail.body.opportunity.title, 'Student Hub Listing');
});

test('draft organization opportunity is not student-visible', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send(opportunityPayload({ title: 'Draft Hidden Role' }))
    .expect(201);

  const { token: studentToken } = await createStudent();
  const list = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(list.body.opportunities.some((item) => item.title === 'Draft Hidden Role'), false);
  await authed('get', `/api/opportunities/${created.body.opportunity.id}`, studentToken).expect(404);
});

test('organization member can read but cannot mutate owner-only resources', async () => {
  const owner = await createOrganizationOwner();
  const member = await addOrganizationMember(owner.organization);
  const created = await authed('post', '/api/organization/opportunities', owner.token)
    .send(opportunityPayload({ title: 'Owner Draft For Member' }))
    .expect(201);
  const opportunityId = created.body.opportunity.id;

  await authed('get', '/api/organization', member.token).expect(200);
  await authed('get', '/api/organization/profile', member.token).expect(200);
  const members = await authed('get', '/api/organization/members', member.token).expect(200);
  assert.equal(members.body.permissions.canManageMembers, false);
  await authed('get', '/api/organization/opportunities', member.token).expect(200);
  await authed('get', `/api/organization/opportunities/${opportunityId}`, member.token).expect(200);

  await authed('post', '/api/organization/opportunities', member.token)
    .send(opportunityPayload({ title: 'Member Should Not Create' }))
    .expect(403);
  await authed('patch', `/api/organization/opportunities/${opportunityId}`, member.token)
    .send(opportunityPayload({ title: 'Member Should Not Edit' }))
    .expect(403);
  await authed('post', `/api/organization/opportunities/${opportunityId}/submit`, member.token).expect(403);
  await authed('delete', `/api/organization/opportunities/${opportunityId}`, member.token).expect(403);
  await authed('put', '/api/organization/profile', member.token)
    .send({ name: 'Hijacked', email: 'hijack@example.com' })
    .expect(403);
  await authed('post', '/api/organization/members', member.token)
    .send({ email: 'someone@example.com', role: 'member' })
    .expect(403);

  const stored = await Opportunity.findById(opportunityId);
  assert.equal(stored.title, 'Owner Draft For Member');
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_DRAFT);
});

test('student added as organization member cannot access student opportunity APIs', async () => {
  const owner = await createOrganizationOwner();
  const student = await createStudent();
  const visible = await Opportunity.create({
    title: 'Still A Student Hub Role',
    organization: 'PathForge Test Org',
    type: 'Internship',
    description: 'Visible only to non-members.',
    applicationUrl: 'https://example.com/apply',
    location: 'Remote',
    approvalStatus: Opportunity.APPROVAL_APPROVED,
    deadline: daysFromNow(21),
  });

  await authed('get', '/api/opportunities', student.token).expect(200);

  await OrganizationUser.create({
    organizationId: owner.organization._id,
    userId: student.user._id,
    role: 'member',
  });
  assert.equal(student.user.role, 'student');

  await authed('get', '/api/opportunities', student.token).expect(403);
  await authed('get', '/api/opportunities/saved', student.token).expect(403);
  await authed('get', `/api/opportunities/${visible.id}`, student.token).expect(403);
  await authed('post', `/api/opportunities/${visible.id}/save`, student.token).expect(403);
  await authed('delete', `/api/opportunities/${visible.id}/save`, student.token).expect(403);

  await authed('get', '/api/organization', student.token).expect(200);
  await authed('get', '/api/organization/members', student.token).expect(200);
});
