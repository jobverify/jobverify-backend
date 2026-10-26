import assert from 'node:assert/strict';
import test from 'node:test';
import OutreachTask from '../src/models/OutreachTask.js';
import OutreachThread from '../src/models/OutreachThread.js';
import OutreachDiscoveryCache from '../src/models/OutreachDiscoveryCache.js';
import OutreachUsage from '../src/models/OutreachUsage.js';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';
import Campaign from '../src/models/Campaign.js';
import { requestDiscovery, saveContact, updateThread, requestDraft, processDiscoveryTask, publicTask, deleteThread } from '../src/services/outreachService.js';
const user = '507f1f77bcf86cd799439011';
const jobId = '507f1f77bcf86cd799439012';
const taskId = '507f1f77bcf86cd799439013';
const threadId = '507f1f77bcf86cd799439014';
const job = { _id: jobId, title: 'Frontend Engineer', company: 'Example Corp', companyDomain: 'example.com', description: 'React' };
const query = value => ({ lean: async () => value, select() { return this; } });
test.beforeEach(t => { t.mock.method(User, 'exists', async () => ({})); });
test('shared cache creates a completed owner-scoped task and performs no quota or provider calls', async t => {
  t.mock.method(Job, 'findOne', filter => { assert.equal(filter.status, 'active'); assert.equal(filter._id, jobId); return query(job); });
  t.mock.method(OutreachTask, 'findOne', async () => null);
  t.mock.method(OutreachDiscoveryCache, 'findOne', () => query({ contacts: [], jobSnapshot: { title: job.title, company: job.company } }));
  t.mock.method(OutreachTask, 'create', async value => ({ _id: taskId, ...value }));
  t.mock.method(OutreachUsage, 'updateOne', async () => assert.fail('cache hits cost no allowance'));
  const task = await requestDiscovery(user, { jobId });
  assert.equal(task.status, 'completed');
  assert.equal(task.user, user);
});
test('discovery duplicate clicks return the existing task before reserving credits', async t => {
  t.mock.method(Job, 'findOne', () => query(job));
  t.mock.method(OutreachTask, 'findOne', async () => ({ _id: taskId, status: 'running' }));
  t.mock.method(OutreachTask, 'create', async () => assert.fail('duplicate request'));
  assert.equal((await requestDiscovery(user, { jobId }))._id, taskId);
});
test('saving contacts requires a completed discovery task owned by the user', async t => {
  t.mock.method(OutreachTask, 'findOne', () => query(null));
  await assert.rejects(saveContact(user, { taskId, contactIndex: 0 }), error => error.statusCode === 404);
});
test('thread edits are revision guarded and client email changes reset provider verification', async t => {
  t.mock.method(OutreachThread, 'findOne', () => query({ _id: threadId, revision: 3, contact: { email: 'old@example.com', emailStatus: 'verified' } }));
  t.mock.method(OutreachThread, 'findOneAndUpdate', async (filter, change) => {
    assert.equal(filter.user, user);
    assert.equal(filter.revision, 3);
    assert.equal(change.$set['contact.emailStatus'], 'unverified');
    assert.equal(change.$set['contact.emailConfirmed'], false);
    assert.equal(change.$set['contact.emailSourceUrl'], '');
    assert.equal(change.$set['contact.emailEvidence'], '');
    assert.equal(change.$inc.revision, 1);
    return { _id: threadId };
  });
  await updateThread(user, threadId, { email: 'new@example.com', revision: 3 });
  await assert.rejects(updateThread(user, threadId, { draft: { linkedin: 'test' }, revision: 1 }), error => error.statusCode === 409);
});
test('draft requests reuse the active task and never trigger a second dispatch', async t => {
  t.mock.method(OutreachThread, 'findOne', () => query({ _id: threadId, job: jobId }));
  t.mock.method(OutreachTask, 'findOne', async () => ({ _id: taskId, status: 'queued' }));
  t.mock.method(OutreachTask, 'create', async () => assert.fail('duplicate request'));
  assert.equal((await requestDraft({ _id: user }, threadId))._id, taskId);
});
test('public task serialization never returns candidate snapshots, leases or deduplication keys', () => {
  const task = publicTask({ _id: taskId, kind: 'draft', status: 'queued', input: { profile: 'private' }, leaseOwner: 'secret', activeKey: 'internal', result: null });
  assert.equal(task.input, undefined);
  assert.equal(task.leaseOwner, undefined);
  assert.equal(task.activeKey, undefined);
});
test('a restarted discovery worker only claims an explicit ready task', async t => {
  t.mock.method(OutreachTask, 'findOneAndUpdate', (...args) => {
    assert.equal(args[0]._id, taskId);
    assert.equal(args[0].ready, true);
    assert.equal(args[0].kind, 'discovery');
    return query(null);
  });
  assert.equal(await processDiscoveryTask(taskId), null);
});
test('removing a thread removes draft campaign recipients and cancels approved pending sends', async t => {
  t.mock.method(OutreachThread, 'deleteOne', async () => ({ deletedCount: 1 }));
  t.mock.method(OutreachTask, 'deleteMany', async () => ({}));
  const states = [];
  t.mock.method(Campaign, 'updateMany', async (filter, update, options) => {
    assert.equal(filter.user, user);
    assert.equal(filter.items.$elemMatch.thread, threadId);
    assert.deepEqual(options.arrayFilters[0]['pending.status'].$in, ['draft', 'queued']);
    assert.equal(options.arrayFilters[0]['pending.thread'], threadId);
    states.push(update.$set['items.$[pending].status']);
    return {};
  });
  await deleteThread(user, threadId);
  assert.deepEqual(states, ['removed', 'cancelled']);
});
