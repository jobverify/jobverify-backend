import assert from 'node:assert/strict';
import test from 'node:test';
import { runModelSmokeTest } from '../outreach/modelSmoke.js';

const draft = { linkedin: 'Hello Alex, could you consider a referral?', emailSubject: 'Frontend Engineer referral', emailBody: 'Hello Alex, I built an accessible React project. Could you consider referring me?' };

test('model smoke test generates a validated synthetic draft and stops the runtime', async () => {
  let stopped = false;
  const result = await runModelSmokeTest({
    prepareRuntime: async () => ({ stop: () => { stopped = true; } }),
    generate: async (input, options) => {
      assert.equal(input.jobSnapshot.company, 'Example Company');
      assert.equal(input.contact.kind, 'likely_contact');
      assert.ok(options.remainingMs > 0);
      return draft;
    },
  });
  assert.deepEqual(result, { attempted: 1, completed: 1, failed: 0 });
  assert.equal(stopped, true);
  assert.equal(result.draft, undefined, 'generated text must not enter workflow summaries');
});

test('model smoke test rejects incomplete output and still stops the model', async () => {
  let stopped = false;
  await assert.rejects(runModelSmokeTest({
    prepareRuntime: async () => ({ stop: () => { stopped = true; } }),
    generate: async () => ({ linkedin: 'Only one field' }),
  }));
  assert.equal(stopped, true);
});

test('expired smoke test never starts the model', async () => {
  await assert.rejects(runModelSmokeTest({ deadline: Date.now() - 1,
    prepareRuntime: async () => assert.fail('deadline already elapsed'),
  }), /budget/);
});

test('startup consuming the smoke test budget stops without generating', async () => {
  let stopped = false;
  const deadline = Date.now() + 60000;
  const originalNow = Date.now;
  try {
    await assert.rejects(runModelSmokeTest({ deadline,
      prepareRuntime: async () => { Date.now = () => deadline; return { stop: () => { stopped = true; } }; },
      generate: async () => assert.fail('startup exhausted the budget'),
    }), /budget/);
  } finally { Date.now = originalNow; }
  assert.equal(stopped, true);
});
