import assert from 'node:assert/strict';
import test from 'node:test';
import Application from '../src/models/Application.js';
import TailoredResume from '../src/models/TailoredResume.js';
import { recordApplicationOpen } from '../src/services/applicationService.js';
import { getApplications, markApplicationApplied } from '../src/controllers/applicationController.js';

const user = '507f1f77bcf86cd799439011';
const jobId = '507f1f77bcf86cd799439012';
const applicationId = '507f1f77bcf86cd799439013';
const job = { _id: jobId, title: 'Frontend Engineer', company: 'Example Corp', location: 'Pune', jobType: 'Full-time', sourceUrl: 'https://example.com/careers/123' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('application schema requires ownership and has one record per user and job', () => {
  assert.ok(new Application({}).validateSync().errors.user);
  assert.ok(Application.schema.indexes().some(([keys, options]) => keys.user === 1 && keys.job === 1 && options.unique));
  assert.equal(new Application({ user, job: jobId, jobSnapshot: job }).status, 'opened');
  assert.ok(new Application({ user, job: jobId, jobSnapshot: job, status: 'submitted' }).validateSync().errors.status);
});

test('opening an application saves a server-owned snapshot without confirming it', async t => {
  t.mock.method(TailoredResume, 'exists', async filter => {
    assert.equal(filter.outputFormat, 'latex-pdf');
    assert.deepEqual(filter.generationId, { $exists: true, $ne: null });
    return { _id: 'tailored' };
  });
  const now = new Date('2026-10-19T10:00:00Z');
  t.mock.method(Application, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter, { user, job: jobId });
    assert.equal(options.upsert, true);
    assert.equal(update.$setOnInsert.status, 'opened');
    assert.equal(update.$setOnInsert.jobSnapshot.title, job.title);
    assert.equal(update.$setOnInsert.jobSnapshot.applicationUrl, job.sourceUrl);
    assert.equal(update.$set.status, undefined, 'reopening must never downgrade an Applied record');
    assert.equal(update.$set.appliedAt, undefined);
    assert.equal(update.$set.lastOpenedAt, now);
    return { _id: applicationId, status: 'opened' };
  });
  assert.equal((await recordApplicationOpen(user, job, now)).status, 'opened');
});

test('concurrent first clicks recover from the unique index conflict', async t => {
  t.mock.method(TailoredResume, 'exists', async () => ({ _id: 'tailored' }));
  let calls = 0;
  t.mock.method(Application, 'findOneAndUpdate', async (_filter, _update, options) => {
    if (++calls === 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
    assert.equal(options.upsert, false);
    return { _id: applicationId, status: 'applied' };
  });
  assert.equal((await recordApplicationOpen(user, job)).status, 'applied');
  assert.equal(calls, 2);
});

test('application snapshots fall back to a safe employer source URL', async t => {
  t.mock.method(TailoredResume, 'exists', async () => ({ _id: 'tailored' }));
  let savedUrl;
  t.mock.method(Application, 'findOneAndUpdate', async (_filter, update) => { savedUrl = update.$setOnInsert.jobSnapshot.applicationUrl; return {}; });
  for (const applyUrl of ['', 'invalid', 'http://example.com/apply', 'javascript:alert(1)', 'https://user:password@example.com/apply']) {
    await recordApplicationOpen(user, { ...job, applyUrl });
    assert.equal(savedUrl, job.sourceUrl);
  }
});

test('Applied can only update the authenticated owner and remains idempotent', async t => {
  const appliedAt = new Date('2026-10-19T10:00:00Z');
  t.mock.method(Application, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter._id, applicationId);
    assert.equal(filter.user, user);
    assert.equal(update[0].$set.status, 'applied');
    return null;
  });
  t.mock.method(Application, 'findOne', async filter => {
    assert.deepEqual(filter, { _id: applicationId, user });
    return { _id: applicationId, status: 'applied', appliedAt };
  });
  const res = response();
  await markApplicationApplied({ user: { _id: user }, params: { applicationId } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.appliedAt, appliedAt);
});

test('another user cannot confirm an application or create one by confirmation', async t => {
  t.mock.method(Application, 'findOneAndUpdate', async () => null);
  t.mock.method(Application, 'findOne', async () => null);
  const res = response();
  await markApplicationApplied({ user: { _id: user }, params: { applicationId } }, res);
  assert.equal(res.statusCode, 404);
});

test('application history is paginated, owner-scoped and retains snapshots without a live job', async t => {
  const item = { _id: applicationId, job: jobId, status: 'opened', jobSnapshot: job };
  t.mock.method(TailoredResume, 'aggregate', async pipeline => {
    assert.equal(String(pipeline[0].$match.user), user);
    const { items } = pipeline.at(-1).$facet;
    assert.deepEqual(items[0], { $match: { status: 'opened' } });
    assert.deepEqual(items.at(-2), { $skip: 20 });
    assert.deepEqual(items.at(-1), { $limit: 20 });
    return [{ items: [item], counts: [{ total: 25, applied: 2 }] }];
  });
  const res = response();
  await getApplications({ user: { _id: user }, query: { page: '2', status: 'opened' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.summary, { total: 25, opened: 23, applied: 2 });
  assert.equal(res.body.pagination.totalPages, 2);
  assert.equal(res.body.data[0]._id, item._id);
  assert.equal(res.body.data[0].jobSnapshot.title, job.title);
  assert.equal(res.body.data[0].jobSnapshot.applicationUrl, job.sourceUrl);
});

test('application history rejects invalid pagination and status filters', async () => {
  for (const query of [{ page: '0' }, { page: '1.5' }, { status: 'unknown' }, { page: { $gt: 0 } }]) {
    const res = response();
    await getApplications({ user: { _id: user }, query }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('application endpoints require authentication and validate confirmation IDs', async () => {
  process.env.JWT_SECRET ||= 'test-secret-'.repeat(4);
  const { default: router } = await import('../src/routes/userRoutes.js');
  for (const path of ['/applications', '/applications/:applicationId/applied']) {
    const route = router.stack.find(layer => layer.route?.path === path)?.route;
    assert.ok(route, path);
    assert.equal(route.stack[0].name, 'protect');
  }
  const res = response();
  await markApplicationApplied({ user: { _id: user }, params: { applicationId: 'invalid' } }, res);
  assert.equal(res.statusCode, 400);
});
