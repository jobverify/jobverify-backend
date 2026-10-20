import assert from 'node:assert/strict';
import test from 'node:test';
import OutreachTask from '../src/models/OutreachTask.js';
import { runOutreachDraftWorker } from '../outreach/draftWorker.js';

function pending(t, rows) {
  t.mock.method(OutreachTask, 'find', filter => {
    assert.equal(filter.kind, 'draft');
    assert.equal(filter.ready, true);
    assert.equal(filter.attempts.$lt, 3);
    return { sort() { return this; }, limit(n) { assert.equal(n, 3); return this; }, select() { return this; }, lean: async () => rows };
  });
}

test('an empty outreach queue never starts the model', async t => {
  pending(t, []);
  assert.deepEqual(await runOutreachDraftWorker({ prepareRuntime: async () => assert.fail('empty queue') }), { attempted: 0, completed: 0, failed: 0 });
});

test('outreach worker bounds generation and stops the runtime after partial failure', async t => {
  pending(t, [{ _id: 'task', attempts: 0 }]);
  let stopped = false;
  const deadline = Date.now() + 60000;
  const result = await runOutreachDraftWorker({ deadline,
    prepareRuntime: async () => ({ stop: () => { stopped = true; } }),
    drain: async options => {
      assert.equal(options.deadline, deadline);
      assert.equal(options.maxTasks, 3);
      return { attempted: 2, completed: 1, failed: 1 };
    },
  });
  assert.equal(stopped, true);
  assert.equal(result.failed, 1);
});

test('startup failure releases only unchanged queued draft requests for explicit retry', async t => {
  pending(t, [{ _id: 'task', attempts: 0 }]);
  t.mock.method(OutreachTask, 'updateOne', async (filter, update) => {
    assert.deepEqual(filter, { _id: 'task', kind: 'draft', attempts: 0, status: 'queued', ready: true });
    assert.equal(update.$set.status, 'failed');
    assert.equal(update.$set.ready, false);
    assert.ok(update.$set.completedAt instanceof Date);
    assert.equal(update.$unset.activeKey, 1);
    assert.doesNotMatch(update.$set.error, /private payload/);
    assert.equal(update.$set.result, undefined, 'preserve existing content');
  });
  await assert.rejects(runOutreachDraftWorker({ prepareRuntime: async () => { throw Error('private payload'); } }));
  assert.equal(OutreachTask.updateOne.mock.callCount(), 1);
});

test('startup exceeding the deadline fails without generating and stops the runtime', async t => {
  pending(t, [{ _id: 'task', attempts: 0 }]);
  t.mock.method(OutreachTask, 'updateOne', async filter => {
    assert.equal(filter.status, 'queued', 'another worker lease must not be overwritten');
    return { modifiedCount: 0 };
  });
  let stopped = false;
  await assert.rejects(runOutreachDraftWorker({ deadline: Date.now(),
    prepareRuntime: async () => ({ stop: () => { stopped = true; } }),
    drain: async () => assert.fail('budget exhausted'),
  }), /budget/);
  assert.equal(stopped, true);
});
