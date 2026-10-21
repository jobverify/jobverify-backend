import assert from 'node:assert/strict';
import test from 'node:test';
import OutreachTask from '../src/models/OutreachTask.js';
import OutreachDiscoveryCache from '../src/models/OutreachDiscoveryCache.js';
import OutreachUsage from '../src/models/OutreachUsage.js';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';
import { requestDiscovery, dispatchOutreachDiscoveries, dispatchOutreachDrafts } from '../src/services/outreachService.js';
import { buildJobContext } from '../src/services/outreachProviders.js';

const user = '507f1f77bcf86cd799439011', jobId = '507f1f77bcf86cd799439012';
const query = value => ({ lean: async () => value, select() { return this; } });
function configure(t, overrides = {}) {
  for (const [key, value] of Object.entries({ OUTREACH_DISCOVERY_PROVIDER: undefined, TAVILY_API_KEY: undefined, GITHUB_PAT: 'fixture', GITHUB_REPO: 'example/backend', OUTREACH_ACTIONS_ENABLED: 'true', OUTREACH_ACTIONS_FREE_CONFIRMED: 'true', ...overrides })) {
    const before = process.env[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    t.after(() => { if (before === undefined) delete process.env[key]; else process.env[key] = before; });
  }
  t.mock.method(User, 'exists', async () => ({}));
  t.mock.method(Job, 'findOne', () => query({ title: 'Frontend Engineer', company: 'Example Corp' }));
  t.mock.method(OutreachTask, 'findOne', async () => null);
  t.mock.method(OutreachDiscoveryCache, 'findOne', () => query(null));
  t.mock.method(OutreachUsage, 'updateOne', async () => ({}));
  t.mock.method(OutreachUsage, 'findOneAndUpdate', async () => ({ used: 1 }));
}

test('default discovery queues an Actions task without Tavily or local provider work', async t => {
  configure(t);
  let created, dispatches = 0;
  t.mock.method(OutreachTask, 'create', async value => { created = value; return { _id: jobId, status: 'queued', ...value }; });
  t.mock.method(OutreachTask, 'updateOne', async () => ({}));
  const result = await requestDiscovery(user, { jobId }, { schedule: () => assert.fail('must not search in the backend'), dispatch: async () => { dispatches++; } });
  assert.equal(created.input.provider, 'actions');
  assert.equal(result.kind, 'discovery');
  assert.equal(result.status, 'queued');
  assert.equal(result.input, undefined);
  assert.equal(dispatches, 1);
  assert.equal(OutreachUsage.findOneAndUpdate.mock.callCount(), 1);
});

test('provider changes invalidate discovery caches without changing public job facts', () => {
  const job = { title: 'Frontend Engineer', company: 'Example Corp' };
  const actions = buildJobContext(job, { provider: 'actions' });
  const tavily = buildJobContext(job, { provider: 'tavily' });
  assert.notEqual(actions.contextHash, tavily.contextHash);
  assert.equal(actions.company, tavily.company);
});

test('cached discovery does not dispatch or require configured Actions access', async t => {
  configure(t, { GITHUB_PAT: undefined, OUTREACH_ACTIONS_ENABLED: 'false' });
  t.mock.method(OutreachDiscoveryCache, 'findOne', () => query({ contacts: [] }));
  t.mock.method(OutreachTask, 'create', async value => ({ _id: jobId, ...value }));
  assert.equal((await requestDiscovery(user, { jobId }, { dispatch: async () => assert.fail('cache hit') })).status, 'completed');
  assert.equal(OutreachUsage.findOneAndUpdate.mock.callCount(), 0);
});

test('discovery dispatch is coalesced, carries no job/profile inputs and shares the outreach cap', async t => {
  configure(t);
  let posts = 0;
  await Promise.all(Array.from({ length: 5 }, () => dispatchOutreachDiscoveries({ request: async (_repo, endpoint, options) => {
    assert.match(endpoint || 'repository', /outreach-discoveries|repository/);
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'release' };
    assert.deepEqual(options.body, { ref: 'release' }); posts++;
  } })));
  assert.equal(posts, 1);
  assert.equal(OutreachUsage.findOneAndUpdate.mock.callCount(), 1);
  assert.match(OutreachUsage.findOneAndUpdate.mock.calls[0].arguments[0].key, /^actions:/);
});

test('Actions free-usage guards reject before touching GitHub or reserving capacity', async t => {
  configure(t, { OUTREACH_ACTIONS_FREE_CONFIRMED: 'false' });
  await assert.rejects(dispatchOutreachDiscoveries({ request: async () => assert.fail('disabled') }), { statusCode: 503 });
  assert.equal(OutreachUsage.findOneAndUpdate.mock.callCount(), 0);
});

test('unconfigured fresh discovery creates no task or usage reservation', async t => {
  configure(t, { GITHUB_PAT: undefined });
  t.mock.method(OutreachTask, 'create', async () => assert.fail('not configured'));
  await assert.rejects(requestDiscovery(user, { jobId }), { statusCode: 503 });
  assert.equal(OutreachTask.create.mock.callCount(), 0);
  assert.equal(OutreachUsage.findOneAndUpdate.mock.callCount(), 0);
});

test('dispatch failures retain context, release the active key, and allow an explicit new request', async t => {
  configure(t);
  const created = [], updates = [];
  t.mock.method(OutreachTask, 'create', async value => { created.push(value); return { _id: jobId, status: 'queued', ...value }; });
  t.mock.method(OutreachTask, 'updateOne', async (where, update) => { updates.push({ where, update }); return { matchedCount: 1 }; });
  const failed = await requestDiscovery(user, { jobId }, { dispatch: async () => { throw new Error('provider details must not be exposed'); } });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.input, undefined);
  assert.doesNotMatch(failed.error, /provider details/);
  assert.equal(created[0].input.context.company, 'Example Corp');
  assert.equal(updates.at(-1).update.$unset.activeKey, 1);
  assert.equal(updates.at(-1).update.$set.status, 'failed');
  const retried = await requestDiscovery(user, { jobId }, { dispatch: async () => {} });
  assert.equal(retried.status, 'queued');
  assert.equal(created.length, 2);
});

test('discovery and drafting consume the same persistent monthly dispatch allowance', async t => {
  configure(t, { OUTREACH_ACTIONS_MONTHLY_RUN_LIMIT: '1' });
  let reservedKey, posts = 0;
  t.mock.method(OutreachUsage, 'findOneAndUpdate', async where => {
    if (reservedKey) { assert.equal(where.key, reservedKey); return null; }
    reservedKey = where.key; return { used: 1 };
  });
  const request = async (_repo, endpoint) => {
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'release' };
    posts++;
  };
  await dispatchOutreachDiscoveries({ request });
  await assert.rejects(dispatchOutreachDrafts({ request }), { statusCode: 429 });
  assert.equal(posts, 1);
  assert.match(reservedKey, /^actions:/);
});

for (const state of ['running', 'completed']) test(`a late dispatch failure preserves a ${state} discovery`, async t => {
  configure(t);
  const stored = { _id: jobId, status: 'queued', attempts: 0, result: null };
  t.mock.method(OutreachTask, 'create', async value => ({ ...stored, ...value }));
  t.mock.method(OutreachTask, 'findById', () => query(stored));
  t.mock.method(OutreachTask, 'updateOne', async (filter, update) => {
    if (filter.status && filter.status !== stored.status || filter.attempts !== undefined && filter.attempts !== stored.attempts) return { matchedCount: 0 };
    Object.assign(stored, update.$set);
    return { matchedCount: 1 };
  });
  const value = await requestDiscovery(user, { jobId }, { dispatch: async () => {
    stored.status = state; stored.attempts = 1; stored.result = state === 'completed' ? { contacts: [{ name: 'Jane Doe' }] } : null;
    throw new Error('Ambiguous GitHub transport failure');
  } });
  assert.equal(stored.status, state);
  assert.equal(value.status, state);
  if (state === 'completed') assert.equal(value.result.contacts[0].name, 'Jane Doe');
});
