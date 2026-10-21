import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import OutreachTask from '../src/models/OutreachTask.js';
import OutreachThread from '../src/models/OutreachThread.js';
import OutreachUsage from '../src/models/OutreachUsage.js';
import OutreachDiscoveryCache from '../src/models/OutreachDiscoveryCache.js';
import OutreachEmailCache from '../src/models/OutreachEmailCache.js';
import { requestDiscovery, processDiscoveryTask, saveContact, recoverOutreachTasks } from '../src/services/outreachService.js';
import { removeUserAccount } from '../src/services/userAccountDeletion.js';
import { searchReferralWeb } from '../outreach/referralSearch.js';

test('Mongo Actions discovery preserves evidence, provider isolation, leases, recovery and account deletion', { timeout: 90000 }, async t => {
  for (const [key, value] of Object.entries({ OUTREACH_DISCOVERY_PROVIDER: 'actions', TAVILY_API_KEY: undefined, HUNTER_API_KEY: undefined,
    OUTREACH_ACTIONS_ENABLED: 'true', OUTREACH_ACTIONS_FREE_CONFIRMED: 'true', GITHUB_PAT: 'fixture-no-network', GITHUB_REPO: 'fixture/backend', MONGOMS_RUNTIME_DOWNLOAD: 'false' })) {
    const before = process.env[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value;
    t.after(() => { if (before === undefined) delete process.env[key]; else process.env[key] = before; });
  }
  const mongo = new MongoMemoryServer({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongo.start();
  await mongoose.connect(mongo.getUri(), { dbName: 'referral_actions_test' });
  await Promise.all([OutreachTask, OutreachThread, OutreachUsage, OutreachDiscoveryCache, OutreachEmailCache].map(model => model.init()));
  const owner = await User.create({ email: 'owner@example.test' });
  const other = await User.create({ email: 'other@example.test' });
  const jobId = new mongoose.Types.ObjectId();
  await Job.collection.insertOne({ _id: jobId, title: 'Frontend Engineer', company: 'Example Corp', companyDomain: 'example.com',
    location: 'Pune, India', isPublicIndia: true, status: 'active', description: 'Build accessible frontend applications.', fingerprint: 'referral-actions-test' });
  let dispatched = 0, searched = 0, ranked = 0;
  const options = { dispatch: async () => { dispatched++; }, schedule: () => assert.fail('Actions must not search in the API process') };
  const results = ['Jane Doe', 'Alex Brown', 'Sam Wilson', 'Jamie Patel'].map(name => ({ title: `${name} - Frontend Engineer at Example Corp | LinkedIn`,
    url: `https://www.linkedin.com/in/${name.toLowerCase().replace(' ', '-')}`, content: `${name} works on frontend applications at Example Corp.` }));
  const providers = { provider: 'actions', search: async () => { searched++; return results; },
    rankContacts: async (_context, contacts) => { ranked++; assert.equal(contacts.length, 4); return [contacts[3], contacts[0], contacts[1]]; },
    findEmail: async () => { throw new Error('Email provider unavailable'); } };
  const requests = await Promise.all(Array.from({ length: 5 }, () => requestDiscovery(owner._id, { jobId: String(jobId) }, options)));
  assert.equal(new Set(requests.map(task => String(task._id))).size, 1);
  assert.equal(dispatched, 1);
  const taskId = requests[0]._id;
  assert.equal(await processDiscoveryTask(taskId), null, 'the backend Tavily worker cannot claim an Actions task');
  const processed = await Promise.all(Array.from({ length: 4 }, () => processDiscoveryTask(taskId, providers)));
  assert.equal(processed.filter(Boolean).length, 1);
  assert.equal(searched, 1); assert.equal(ranked, 1);
  const completed = await OutreachTask.findById(taskId).lean();
  assert.equal(completed.status, 'completed');
  assert.deepEqual(completed.result.contacts.map(contact => contact.name), ['Jamie Patel', 'Jane Doe', 'Alex Brown']);
  assert.ok(completed.result.contacts.every(contact => contact.sourceUrl && contact.evidence && contact.emailStatus === 'unavailable'));
  assert.equal(await OutreachUsage.countDocuments({ key: /^provider:tavily:/ }), 0);
  assert.equal((await OutreachUsage.findOne({ key: /^provider:searxng:/ })).used, 1);
  assert.equal(await OutreachThread.countDocuments(), 0, 'discovery does not save a private outreach record');
  const cached = await requestDiscovery(other._id, { jobId: String(jobId) }, options);
  assert.equal(cached.status, 'completed'); assert.equal(dispatched, 1);
  assert.equal(await OutreachUsage.countDocuments({ user: other._id }), 0);
  await assert.rejects(saveContact(other._id, { taskId: String(taskId), contactIndex: 0 }), { statusCode: 404 });
  const thread = await saveContact(owner._id, { taskId: String(taskId), contactIndex: 0 });
  assert.equal(thread.contact.name, 'Jamie Patel');

  await t.test('a replaced lease cannot publish its model result or replace the shared cache', async () => {
    const task = await requestDiscovery(owner._id, { jobId: String(jobId), refresh: true }, options);
    const value = await processDiscoveryTask(task._id, { ...providers, rankContacts: async (_context, contacts) => {
      await OutreachTask.updateOne({ _id: task._id }, { $set: { leaseOwner: 'replacement-worker' } }); return [contacts[2]];
    } });
    assert.equal(value, null);
    assert.equal((await OutreachTask.findById(task._id)).status, 'running');
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts[0].name, 'Jamie Patel');
    await OutreachTask.updateOne({ _id: task._id }, { $set: { status: 'failed' }, $unset: { activeKey: 1, leaseOwner: 1, leaseUntil: 1 } });
  });

  await t.test('unsupported model facts fail without overwriting useful cached evidence', async () => {
    const task = await requestDiscovery(owner._id, { jobId: String(jobId), refresh: true }, options);
    await processDiscoveryTask(task._id, { ...providers, rankContacts: async (_context, contacts) => [{ ...contacts[0], name: 'Fabricated Person' }] });
    const failed = await OutreachTask.findById(task._id).select('+input').lean();
    assert.equal(failed.status, 'failed'); assert.match(failed.error, /unsupported/);
    assert.equal(failed.input.context.company, 'Example Corp'); assert.equal(failed.activeKey, undefined);
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts[0].name, 'Jamie Patel');
  });

  await t.test('upstream outages remain failed tasks with context rather than empty successful caches', async () => {
    const task = await requestDiscovery(other._id, { jobId: String(jobId), refresh: true }, options);
    await processDiscoveryTask(task._id, { ...providers, search: async () => { throw new Error('Search unavailable'); } });
    const failed = await OutreachTask.findById(task._id).select('+input').lean();
    assert.equal(failed.status, 'failed'); assert.ok(failed.input.context);
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts.length, 3);
  });

  await t.test('recovery dispatches persisted Actions jobs without running local search or consuming another user allowance', async () => {
    const task = await requestDiscovery(owner._id, { jobId: String(jobId), refresh: true }, options);
    await OutreachTask.updateOne({ _id: task._id }, { $unset: { dispatchAt: 1 } });
    const before = await OutreachUsage.findOne({ user: owner._id });
    let recoveries = 0;
    await recoverOutreachTasks({ runDiscovery: async () => assert.fail('Actions tasks belong on runners'), dispatchDiscovery: async () => { recoveries++; }, dispatchDraft: async () => assert.fail('no draft requested') });
    assert.equal(recoveries, 1);
    assert.equal((await OutreachUsage.findById(before._id)).used, before.used);
    assert.ok((await OutreachTask.findById(task._id)).dispatchAt);
    await OutreachTask.updateOne({ _id: task._id }, { $set: { status: 'failed' }, $unset: { activeKey: 1 } });
  });

  await t.test('account deletion during model ranking cannot recreate private records', async () => {
    const task = await requestDiscovery(owner._id, { jobId: String(jobId), refresh: true }, options);
    await processDiscoveryTask(task._id, { ...providers, rankContacts: async (_context, contacts) => { await removeUserAccount(owner); return [contacts[0]]; } });
    assert.equal(await User.exists({ _id: owner._id }), null);
    assert.equal(await OutreachTask.countDocuments({ user: owner._id }), 0);
    assert.equal(await OutreachThread.countDocuments({ user: owner._id }), 0);
    assert.equal(await OutreachUsage.countDocuments({ user: owner._id }), 0);
    assert.equal(await OutreachDiscoveryCache.countDocuments({}), 1);
  });

  for (const cached of [false, true]) await t.test(`lease expiry at the terminal write cannot publish ${cached ? 'cached' : 'generated'} results`, async sub => {
    const raceUser = await User.create({ email: `lease-${cached}@example.test` });
    const task = await requestDiscovery(raceUser._id, { jobId: String(jobId), refresh: true }, options);
    if (cached) await OutreachTask.updateOne({ _id: task._id }, { $set: { 'input.refresh': false } });
    const originalUpdate = OutreachTask.updateOne.bind(OutreachTask);
    let raced = false;
    const patched = sub.mock.method(OutreachTask, 'updateOne', async (where, update, ...rest) => {
      if (String(where._id) === String(task._id) && update.$set?.status === 'completed' && !raced) {
        raced = true;
        await originalUpdate({ _id: task._id }, { $set: { leaseUntil: new Date(0) } });
      }
      return originalUpdate(where, update, ...rest);
    });
    const value = await processDiscoveryTask(task._id, { ...providers, rankContacts: async (_context, contacts) => [contacts[2]] });
    assert.equal(raced, true);
    assert.equal(value, null);
    assert.equal((await OutreachTask.findById(task._id)).status, 'running');
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts[0].name, 'Jamie Patel');
    patched.mock.restore();
  });

  await t.test('expired cache leases cannot overwrite newer public evidence', async sub => {
    const raceUser = await User.create({ email: 'cache-lease@example.test' });
    const task = await requestDiscovery(raceUser._id, { jobId: String(jobId), refresh: true }, options);
    const originalUpdate = OutreachDiscoveryCache.updateOne.bind(OutreachDiscoveryCache);
    let raced = false;
    const patched = sub.mock.method(OutreachDiscoveryCache, 'updateOne', async (where, update, ...rest) => {
      if (update.$set?.expiresAt && !raced) {
        raced = true;
        await originalUpdate({ contextHash: where.contextHash }, { $set: { leaseUntil: new Date(0) } });
      }
      return originalUpdate(where, update, ...rest);
    });
    await processDiscoveryTask(task._id, { ...providers, rankContacts: async (_context, contacts) => [contacts[2]] });
    assert.equal(raced, true);
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts[0].name, 'Jamie Patel');
    patched.mock.restore();
  });

  await t.test('partial engine outages with unrelated pages cannot replace contacts with an empty success', async () => {
    const raceUser = await User.create({ email: 'partial-search@example.test' });
    const task = await requestDiscovery(raceUser._id, { jobId: String(jobId), refresh: true }, options);
    await processDiscoveryTask(task._id, { provider: 'actions',
      search: context => searchReferralWeb(context, { fetchImpl: async () => ({ ok: true, json: async () => ({
        results: [{ title: 'Careers at Example Corp', url: 'https://example.com/careers', content: 'Browse our open frontend roles.' }],
        unresponsive_engines: [['brave', 'CAPTCHA'], ['duckduckgo', 'timeout']],
      }) }) }), rankContacts: async (_context, contacts) => contacts.slice(0, 3),
    });
    const failed = await OutreachTask.findById(task._id).select('+input').lean();
    assert.equal(failed.status, 'failed');
    assert.match(failed.error, /unavailable|blocked/);
    assert.ok(failed.input.context);
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts[0].name, 'Jamie Patel');
  });

  await t.test('deletion during the final private write cannot leave a task or publish new cache data', async sub => {
    const raceUser = await User.create({ email: 'final-delete@example.test' });
    const task = await requestDiscovery(raceUser._id, { jobId: String(jobId), refresh: true }, options);
    const originalUpdate = OutreachTask.updateOne.bind(OutreachTask);
    let deleted = false;
    const patched = sub.mock.method(OutreachTask, 'updateOne', async (where, update, ...rest) => {
      const written = await originalUpdate(where, update, ...rest);
      if (String(where._id) === String(task._id) && update.$set?.status === 'completed' && !deleted) {
        deleted = true; await removeUserAccount(raceUser);
      }
      return written;
    });
    const value = await processDiscoveryTask(task._id, { ...providers, rankContacts: async (_context, contacts) => [contacts[2]] });
    assert.equal(deleted, true); assert.equal(value, null);
    assert.equal(await OutreachTask.countDocuments({ user: raceUser._id }), 0);
    assert.equal(await OutreachUsage.countDocuments({ user: raceUser._id }), 0);
    assert.equal((await OutreachDiscoveryCache.findOne({})).contacts[0].name, 'Jamie Patel');
    patched.mock.restore();
  });
});
