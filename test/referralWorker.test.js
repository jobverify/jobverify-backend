import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';
import OutreachTask from '../src/models/OutreachTask.js';
import { runReferralDiscoveryWorker, referralWorkerDeadline } from '../outreach/discoveryWorker.js';
import { prepareReferralSearchRuntime, SEARCH_IMAGE } from '../outreach/searchRuntime.js';
import { findPublicReferralEmail } from '../outreach/referralSearch.js';

function pending(t, rows) {
  t.mock.method(OutreachTask, 'find', filter => {
    assert.equal(filter.kind, 'discovery');
    assert.equal(filter['input.provider'], 'actions');
    assert.equal(filter.ready, true);
    return { sort() { return this; }, limit(count) { assert.equal(count, 3); return this; }, select() { return this; }, lean: async () => rows };
  });
}

test('an empty discovery queue starts neither search nor model runtime', async t => {
  pending(t, []);
  assert.deepEqual(await runReferralDiscoveryWorker({ prepareSearch: async () => assert.fail('empty queue'), prepareModel: async () => assert.fail('empty queue') }), { attempted: 0, completed: 0, failed: 0 });
});

test('the discovery worker bounds tasks and always stops both runtimes', async t => {
  pending(t, [{ _id: 'first', status: 'queued', attempts: 0 }, { _id: 'second', status: 'queued', attempts: 0 }]);
  const stopped = [];
  const deadline = Date.now() + 60000;
  let calls = 0;
  const result = await runReferralDiscoveryWorker({ deadline,
    prepareSearch: async () => ({ stop: () => stopped.push('search') }), prepareModel: async options => { assert.equal(options.deadline, deadline); return { stop: () => stopped.push('model') }; },
    processTask: async (_id, options) => { calls++; assert.equal(options.provider, 'actions'); assert.equal(typeof options.search, 'function'); assert.equal(typeof options.rankContacts, 'function'); assert.equal(options.findEmail, findPublicReferralEmail); assert.ok(options.deadline <= deadline); return { contacts: [] }; },
  });
  assert.equal(calls, 2);
  assert.deepEqual(result, { attempted: 2, completed: 2, failed: 0 });
  assert.deepEqual(stopped.sort(), ['model', 'search']);
});

test('startup failure releases only unchanged requests and cleans a partially started runtime', async t => {
  pending(t, [{ _id: 'first', status: 'queued', attempts: 0 }]);
  t.mock.method(OutreachTask, 'updateOne', async (filter, update) => {
    assert.equal(filter._id, 'first'); assert.equal(filter.attempts, 0); assert.equal(filter.status, 'queued');
    assert.equal(filter['input.provider'], 'actions');
    assert.equal(update.$set.status, 'failed'); assert.equal(update.$unset.activeKey, 1);
    assert.doesNotMatch(update.$set.error, /private details/);
  });
  let stopped = false;
  await assert.rejects(runReferralDiscoveryWorker({ prepareSearch: async () => ({ stop: () => { stopped = true; } }), prepareModel: async () => { throw new Error('private details'); } }));
  assert.equal(stopped, true);
  assert.equal(OutreachTask.updateOne.mock.callCount(), 1);
});

test('one runtime cleanup failure cannot prevent the other runtime from stopping', async t => {
  pending(t, [{ _id: 'first', status: 'queued', attempts: 0 }]);
  let modelStopped = false;
  const result = await runReferralDiscoveryWorker({
    prepareSearch: async () => ({ stop: () => { throw new Error('Search cleanup failed'); } }),
    prepareModel: async () => ({ stop: () => { modelStopped = true; } }),
    processTask: async () => ({ contacts: [] }),
  });
  assert.equal(modelStopped, true);
  assert.equal(result.completed, 1);
});

test('expired worker budgets never start services or claim tasks', async t => {
  pending(t, [{ _id: 'first', status: 'queued', attempts: 0 }]);
  t.mock.method(OutreachTask, 'updateOne', async () => ({}));
  await assert.rejects(runReferralDiscoveryWorker({ deadline: Date.now() - 1, prepareSearch: async () => assert.fail('expired'), prepareModel: async () => assert.fail('expired'), processTask: async () => assert.fail('expired') }), /budget/);
});

test('delayed startup cleans both runtimes without claiming work after the deadline', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  pending(t, [{ _id: 'first', status: 'queued', attempts: 0 }]);
  t.mock.method(OutreachTask, 'updateOne', async () => ({ matchedCount: 1 }));
  const deadline = Date.now() + 60000, stopped = [];
  await assert.rejects(runReferralDiscoveryWorker({ deadline,
    prepareSearch: async () => ({ stop: () => stopped.push('search') }),
    prepareModel: async options => {
      assert.equal(options.deadline, deadline);
      t.mock.timers.tick(61000);
      return { stop: () => stopped.push('model') };
    }, processTask: async () => assert.fail('startup used the remaining processing budget'),
  }), /budget/);
  assert.deepEqual(stopped.sort(), ['model', 'search']);
});

test('search container is pinned, loopback-only, configured for JSON and cleaned after use', async () => {
  assert.match(SEARCH_IMAGE, /^ghcr\.io\/searxng\/searxng@sha256:[a-f0-9]{64}$/);
  const calls = [];
  let configuration;
  const runtime = await prepareReferralSearchRuntime({ execute: async (binary, args) => {
    calls.push({ binary, args });
    if (args[0] === 'run') {
      assert.ok(args.includes('127.0.0.1:8780:8080'));
      assert.equal(args[args.indexOf('--log-driver') + 1], 'none');
      const mount = args[args.indexOf('--mount') + 1];
      configuration = /source=(.+),target=/.exec(mount)[1];
      const settings = await readFile(configuration, 'utf8');
      assert.match(settings, /formats: \[json\]/);
      assert.match(settings, /keep_only:/);
      assert.doesNotMatch(settings, /api_key|MONGO|profile|prompt/i);
    }
  }, fetchImpl: async () => ({ ok: true }) });
  await runtime.stop(); await runtime.stop();
  assert.equal(calls.filter(call => call.args[0] === 'rm').length, 1);
  await assert.rejects(access(configuration));
});

test('discovery deadlines leave cleanup time under both job and worker-step limits', () => {
  const jobStarted = Date.parse('2026-10-20T00:00:00Z');
  for (const setupMs of [20000, 90000, 4 * 60000]) {
    const workerStarted = jobStarted + setupMs;
    const deadline = referralWorkerDeadline(new Date(jobStarted).toISOString(), workerStarted);
    assert.ok(deadline <= workerStarted + 7.5 * 60000, 'reserve thirty seconds before the eight-minute step timeout');
    assert.ok(deadline <= jobStarted + 9 * 60000, 'leave a minute before the ten-minute job timeout');
  }
  assert.equal(referralWorkerDeadline('invalid', jobStarted), jobStarted + 7.5 * 60000);
});

test('discovery workflow uses standard bounded runners and a model-only cache', async () => {
  const workflow = await readFile(new URL('../.github/workflows/outreach-discoveries.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(workflow, /OUTREACH_ACTIONS_FREE_CONFIRMED/);
  assert.match(workflow, /node scripts\/runOutreachDiscoveries\.js/);
  assert.match(workflow, /path: \.cache\/outreach-models\/LFM2\.5-1\.2B-Instruct-Q4_K_M\.gguf/);
  assert.doesNotMatch(workflow, /upload-artifact|TAVILY_API_KEY|HUNTER_API_KEY|pull_request:|schedule:|inputs:/);
});
