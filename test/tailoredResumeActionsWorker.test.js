import assert from 'node:assert/strict';
import test from 'node:test';
import TailoredResume from '../src/models/TailoredResume.js';
import { runTailoredResumeWorker } from '../outreach/tailoredResumeWorker.js';

const pending = (t, rows) => t.mock.method(TailoredResume, 'find', filter => {
  assert.equal(filter.ready, true);
  assert.equal(filter.attempts.$lt, 3);
  return { sort() { return this; }, limit(n) { assert.equal(n, 3); return this; }, select() { return this; }, lean: async () => rows };
});

test('an empty resume queue does not download or start a model', async t => {
  pending(t, []);
  assert.deepEqual(await runTailoredResumeWorker({ prepareRuntime: async () => assert.fail('no compute for an empty queue') }), { attempted: 0, completed: 0, failed: 0 });
});

test('resume worker shares one deadline, processes only tailoring and always stops its model', async t => {
  pending(t, [{ _id: 'owner:job', revision: 2 }]);
  const deadline = Date.now() + 60000;
  let stopped = 0;
  const generate = () => {};
  const result = await runTailoredResumeWorker({ deadline, generate,
    prepareRuntime: async () => ({ stop: () => { stopped++; } }),
    drain: async options => {
      assert.equal(options.deadline, deadline);
      assert.equal(options.generate, generate);
      assert.equal(options.maxTasks, 3);
      return { attempted: 3, completed: 2, failed: 1 };
    },
  });
  assert.equal(stopped, 1);
  assert.deepEqual(result, { attempted: 3, completed: 2, failed: 1 });
});

test('startup failures mark only the unchanged queued revisions failed so users can retry', async t => {
  pending(t, [{ _id: 'owner:job', revision: 2 }]);
  t.mock.method(TailoredResume, 'updateOne', async (filter, update) => {
    assert.deepEqual(filter, { _id: 'owner:job', revision: 2, status: 'queued', ready: true });
    assert.equal(update.$set.status, 'failed');
    assert.equal(update.$set.ready, false);
    assert.doesNotMatch(update.$set.error, /private payload/);
    return { modifiedCount: 1 };
  });
  await assert.rejects(runTailoredResumeWorker({ prepareRuntime: async () => { throw Error('private payload'); } }));
  assert.equal(TailoredResume.updateOne.mock.callCount(), 1);
});

test('a worker interruption stops the runtime without overwriting newer or actively leased requests', async t => {
  pending(t, [{ _id: 'owner:job', revision: 2 }]);
  let stopped = false;
  t.mock.method(TailoredResume, 'updateOne', async filter => {
    assert.equal(filter.revision, 2);
    assert.equal(filter.status, 'queued');
    return { modifiedCount: 0 };
  });
  await assert.rejects(runTailoredResumeWorker({ prepareRuntime: async () => ({ stop: () => { stopped = true; } }), drain: async () => { throw Error('interrupted'); } }));
  assert.equal(stopped, true);
});
