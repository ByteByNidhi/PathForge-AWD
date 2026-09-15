const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const SavedOpportunity = require('../models/SavedOpportunity');
const Skill = require('../models/Skill');
const CareerPathRequest = require('../models/CareerPathRequest');
const Organization = require('../models/Organization');
const OrganizationUser = require('../models/OrganizationUser');
const User = require('../models/User');
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

function isoDate(days) {
  return daysFromNow(days).toISOString().slice(0, 10);
}

function adminPayload(overrides = {}) {
  return {
    title: overrides.title || 'Admin Manual Role',
    organization: overrides.organization || 'PathForge',
    type: overrides.type || 'Internship',
    description: overrides.description || 'Admin-created listing.',
    requiredSkills: overrides.requiredSkills || 'JavaScript',
    eligibility: overrides.eligibility || 'Students welcome',
    deadline: Object.prototype.hasOwnProperty.call(overrides, 'deadline')
      ? overrides.deadline
      : isoDate(60),
    applicationUrl: Object.prototype.hasOwnProperty.call(overrides, 'applicationUrl')
      ? overrides.applicationUrl
      : 'https://example.com/admin-apply',
    location: overrides.location || 'Remote',
  };
}

async function createPendingOrgOpportunity(owner, overrides = {}) {
  const created = await authed('post', '/api/organization/opportunities', owner.token)
    .send({
      title: overrides.title || 'Org Pending Role',
      type: 'Internship',
      description: 'Needs review.',
      location: 'Remote',
      deadline: isoDate(20),
      applicationUrl: 'https://example.com/org-apply',
      eligibility: 'Students',
      noSpecificSkill: true,
      intent: 'submit',
    })
    .expect(201);
  return created.body.opportunity;
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

test('admin can access admin opportunities and student cannot', async () => {
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();

  const adminList = await authed('get', '/api/admin/opportunities', adminToken).expect(200);
  assert.equal(adminList.body.success, true);
  assert.ok(Array.isArray(adminList.body.opportunities));
  assert.ok(Array.isArray(adminList.body.pending));

  await authed('get', '/api/admin/opportunities', studentToken).expect(403);
  await authed('get', '/api/admin', studentToken).expect(403);
});

test('organization member cannot access admin APIs', async () => {
  const { token } = await createOrganizationOwner();
  await authed('get', '/api/admin/opportunities', token).expect(403);
  await authed('get', '/api/admin/organizations', token).expect(403);
  await authed('post', '/api/admin/opportunities', token).send(adminPayload()).expect(403);
});

test('admin can view pending opportunity', async () => {
  const owner = await createOrganizationOwner();
  const pending = await createPendingOrgOpportunity(owner);
  const { token } = await createAdmin();

  const response = await authed('get', `/api/admin/opportunities/${pending.id}`, token).expect(200);
  assert.equal(response.body.opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
  assert.equal(response.body.opportunity.title, pending.title);
});

test('admin can approve pending opportunity and it becomes student-visible', async () => {
  const owner = await createOrganizationOwner();
  const pending = await createPendingOrgOpportunity(owner, { title: 'Approve Me' });
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();

  const approved = await authed('post', `/api/admin/opportunities/${pending.id}/approve`, adminToken).expect(200);
  assert.equal(approved.body.opportunity.approvalStatus, Opportunity.APPROVAL_APPROVED);
  assert.equal(approved.body.opportunity.rejectionReason, null);
  assert.equal(String(approved.body.opportunity.organizationId), String(owner.organization._id));
  assert.equal(String(approved.body.opportunity.submittedByUserId), String(owner.user._id));
  assert.equal(approved.body.opportunity.source, Opportunity.SOURCE_ORGANIZATION);

  const stored = await Opportunity.findById(pending.id);
  assert.equal(isVisibleToStudents(stored), true);

  const hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.title === 'Approve Me'), true);
});

test('admin can reject opportunity, reason is persisted, and it is not student-visible', async () => {
  const owner = await createOrganizationOwner();
  const pending = await createPendingOrgOpportunity(owner, { title: 'Reject Me' });
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();

  const rejected = await authed('post', `/api/admin/opportunities/${pending.id}/reject`, adminToken)
    .send({ rejectionReason: 'Needs a clearer description.' })
    .expect(200);

  assert.equal(rejected.body.opportunity.approvalStatus, Opportunity.APPROVAL_REJECTED);
  assert.equal(rejected.body.opportunity.rejectionReason, 'Needs a clearer description.');

  const stored = await Opportunity.findById(pending.id);
  assert.equal(isVisibleToStudents(stored), false);

  const hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.title === 'Reject Me'), false);
});

test('organization can see rejection reason and resubmit rejected opportunity', async () => {
  const owner = await createOrganizationOwner();
  const pending = await createPendingOrgOpportunity(owner, { title: 'Resubmit Me' });
  const { token: adminToken } = await createAdmin();

  await authed('post', `/api/admin/opportunities/${pending.id}/reject`, adminToken)
    .send({ rejectionReason: 'Add eligibility details.' })
    .expect(200);

  const detail = await authed('get', `/api/organization/opportunities/${pending.id}`, owner.token).expect(200);
  assert.equal(detail.body.opportunity.rejectionReason, 'Add eligibility details.');
  assert.equal(detail.body.opportunity.approvalStatus, Opportunity.APPROVAL_REJECTED);

  const resubmitted = await authed('post', `/api/organization/opportunities/${pending.id}/submit`, owner.token).expect(
    200
  );
  assert.equal(resubmitted.body.opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
  assert.equal(resubmitted.body.opportunity.rejectionReason, null);
  assert.equal(isVisibleToStudents(await Opportunity.findById(pending.id)), false);
});

test('organization cannot approve its own opportunity', async () => {
  const owner = await createOrganizationOwner();
  const pending = await createPendingOrgOpportunity(owner);

  await authed('post', `/api/organization/opportunities/${pending.id}/approve`, owner.token).expect(404);
  await authed('post', `/api/admin/opportunities/${pending.id}/approve`, owner.token).expect(403);

  const stored = await Opportunity.findById(pending.id);
  assert.equal(stored.approvalStatus, Opportunity.APPROVAL_PENDING);
});

test('Himalayas pending opportunity can be approved and rejected', async () => {
  const himalayas = await Opportunity.create({
    title: 'Remote Himalayas Job',
    organization: 'Acme',
    type: 'Internship',
    description: 'Imported listing.',
    deadline: daysFromNow(40),
    applicationUrl: 'https://himalayas.app/jobs/acme',
    location: 'Remote',
    source: Opportunity.SOURCE_HIMALAYAS,
    externalId: 'himalayas-job-1',
    sourceUrl: 'https://himalayas.app/jobs/acme',
    approvalStatus: Opportunity.APPROVAL_PENDING,
  });
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();

  const approved = await authed('post', `/api/admin/opportunities/${himalayas.id}/approve`, adminToken).expect(200);
  assert.equal(approved.body.opportunity.approvalStatus, Opportunity.APPROVAL_APPROVED);
  assert.equal(approved.body.opportunity.source, Opportunity.SOURCE_HIMALAYAS);
  assert.equal(approved.body.opportunity.externalId, 'himalayas-job-1');
  assert.equal(isVisibleToStudents(await Opportunity.findById(himalayas.id)), true);

  const hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.title === 'Remote Himalayas Job'), true);

  const rejected = await authed('post', `/api/admin/opportunities/${himalayas.id}/reject`, adminToken)
    .send({ rejectionReason: 'Duplicate listing.' })
    .expect(200);
  assert.equal(rejected.body.opportunity.approvalStatus, Opportunity.APPROVAL_REJECTED);
  assert.equal(isVisibleToStudents(await Opportunity.findById(himalayas.id)), false);
});

test('admin manual creation produces approved opportunity', async () => {
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();

  const created = await authed('post', '/api/admin/opportunities', adminToken)
    .send(adminPayload({ title: 'Manual Approved Role' }))
    .expect(201);

  assert.equal(created.body.opportunity.approvalStatus, Opportunity.APPROVAL_APPROVED);
  assert.equal(created.body.opportunity.source, null);
  assert.equal(created.body.opportunity.organizationId, null);
  assert.equal(isVisibleToStudents(await Opportunity.findById(created.body.opportunity.id)), true);

  const hub = await authed('get', '/api/opportunities', studentToken).expect(200);
  assert.equal(hub.body.opportunities.some((item) => item.title === 'Manual Approved Role'), true);
});

test('admin manual deadline greater than 2 years is rejected', async () => {
  const { token } = await createAdmin();
  const far = daysFromNow(800);
  const response = await authed('post', '/api/admin/opportunities', token)
    .send(adminPayload({ deadline: far.toISOString().slice(0, 10) }))
    .expect(400);
  assert.match(response.body.message, /2 years/i);
});

test('organization deadline greater than 1 year remains rejected by organization rules', async () => {
  const { token } = await createOrganizationOwner();
  const far = daysFromNow(400);
  const response = await authed('post', '/api/organization/opportunities', token)
    .send({
      title: 'Too Far Org Role',
      type: 'Internship',
      description: 'Too far.',
      deadline: far.toISOString().slice(0, 10),
      applicationUrl: 'https://example.com/apply',
      noSpecificSkill: true,
    })
    .expect(400);
  assert.match(response.body.message, /1 year/i);
});

test('invalid application URL is rejected', async () => {
  const { token } = await createAdmin();
  const response = await authed('post', '/api/admin/opportunities', token)
    .send(adminPayload({ applicationUrl: 'javascript:alert(1)' }))
    .expect(400);
  assert.match(response.body.message, /http or https/i);
});

test('admin edit works and preserves source identity', async () => {
  const himalayas = await Opportunity.create({
    title: 'Himalayas Edit Target',
    organization: 'Acme',
    type: 'Internship',
    description: 'Imported.',
    deadline: daysFromNow(400),
    applicationUrl: 'https://himalayas.app/jobs/edit-me',
    location: 'Remote',
    source: Opportunity.SOURCE_HIMALAYAS,
    externalId: 'keep-external',
    sourceUrl: 'https://himalayas.app/jobs/edit-me',
    approvalStatus: Opportunity.APPROVAL_PENDING,
    organizationId: null,
    submittedByUserId: null,
  });
  const { token } = await createAdmin();

  const updated = await authed('patch', `/api/admin/opportunities/${himalayas.id}`, token)
    .send({
      title: 'Himalayas Edited Title',
      organization: 'Acme Updated',
      type: 'Internship',
      description: 'Edited copy.',
      requiredSkills: 'Python',
      eligibility: 'Anyone',
      deadline: daysFromNow(400).toISOString().slice(0, 10),
      applicationUrl: 'https://himalayas.app/jobs/edit-me',
      location: 'Worldwide',
      source: 'organization',
      externalId: 'tampered',
      organizationId: '000000000000000000000000',
      submittedByUserId: '000000000000000000000000',
    })
    .expect(200);

  assert.equal(updated.body.opportunity.title, 'Himalayas Edited Title');
  assert.equal(updated.body.opportunity.location, 'Worldwide');
  assert.equal(updated.body.opportunity.source, Opportunity.SOURCE_HIMALAYAS);
  assert.equal(updated.body.opportunity.externalId, 'keep-external');
  assert.equal(updated.body.opportunity.organizationId, null);
  assert.equal(updated.body.opportunity.submittedByUserId, null);
  assert.equal(updated.body.opportunity.approvalStatus, Opportunity.APPROVAL_PENDING);
});

test('admin delete works and cleans related records', async () => {
  const { token: adminToken } = await createAdmin();
  const { token: studentToken } = await createStudent();
  const skill = await Skill.create({ name: 'JavaScript', slug: `js-${Date.now()}` });
  const created = await authed('post', '/api/admin/opportunities', adminToken)
    .send(adminPayload({ title: 'Delete Me' }))
    .expect(201);

  const id = created.body.opportunity.id;
  await OpportunitySkill.create({ opportunityId: id, skillId: skill._id });
  await authed('post', `/api/opportunities/${id}/save`, studentToken).expect(200);

  await authed('delete', `/api/admin/opportunities/${id}`, adminToken).expect(200);
  assert.equal(await Opportunity.findById(id), null);
  assert.equal(await OpportunitySkill.countDocuments({ opportunityId: id }), 0);
  assert.equal(await SavedOpportunity.countDocuments({ opportunityId: id }), 0);
});

test('cross-user and cross-role authorization works', async () => {
  const owner = await createOrganizationOwner();
  const pending = await createPendingOrgOpportunity(owner);
  const { token: studentToken } = await createStudent();
  const { token: otherAdminToken } = await createAdmin();

  await authed('post', `/api/admin/opportunities/${pending.id}/approve`, studentToken)
    .send({ role: 'admin', isAdmin: true })
    .expect(403);

  await authed('post', `/api/admin/opportunities/${pending.id}/reject`, owner.token)
    .send({ rejectionReason: 'self reject' })
    .expect(403);

  const approved = await authed('post', `/api/admin/opportunities/${pending.id}/approve`, otherAdminToken).expect(200);
  assert.equal(approved.body.opportunity.approvalStatus, Opportunity.APPROVAL_APPROVED);
});

test('draft cannot be approved or rejected', async () => {
  const { token } = await createOrganizationOwner();
  const created = await authed('post', '/api/organization/opportunities', token)
    .send({
      title: 'Still Draft',
      type: 'Internship',
      description: 'Draft only.',
      noSpecificSkill: true,
    })
    .expect(201);
  const { token: adminToken } = await createAdmin();

  await authed('post', `/api/admin/opportunities/${created.body.opportunity.id}/approve`, adminToken).expect(403);
  await authed('post', `/api/admin/opportunities/${created.body.opportunity.id}/reject`, adminToken).expect(403);
});

test('admin can create an organization with an owner account', async () => {
  const { token } = await createAdmin();
  const suffix = `${Date.now()}`;
  const created = await authed('post', '/api/admin/organizations', token)
    .send({
      name: `Admin Created Org ${suffix}`,
      email: `org-${suffix}@example.com`,
      website: 'https://example.com',
      ownerName: 'Org Owner',
      ownerEmail: `owner-${suffix}@example.com`,
      ownerPassword: 'password12',
    })
    .expect(201);

  assert.equal(created.body.organization.status, 'active');
  assert.ok(created.body.organization.slug);
  const owner = await User.findOne({ email: `owner-${suffix}@example.com` });
  assert.equal(owner.role, 'organization');
  assert.equal(await OrganizationUser.countDocuments({ organizationId: created.body.organization.id }), 1);
  assert.equal(await Organization.countDocuments({ _id: created.body.organization.id }), 1);
});

test('admin can review career path requests', async () => {
  const { user } = await createStudent();
  await CareerPathRequest.create({
    user: user._id,
    requestedPath: 'Game Design',
    status: 'pending',
  });
  const { token } = await createAdmin();

  const listed = await authed('get', '/api/admin/career-path-requests', token).expect(200);
  assert.equal(listed.body.groups[0].requestedPath, 'Game Design');
  assert.equal(listed.body.groups[0].pendingCount, 1);

  await authed('post', '/api/admin/career-path-requests/review', token)
    .send({ requestedPath: 'Game Design' })
    .expect(200);

  const stored = await CareerPathRequest.findOne({ requestedPath: 'Game Design' });
  assert.equal(stored.status, 'reviewed');
});
