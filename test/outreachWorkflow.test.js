import assert from 'node:assert/strict';
import test from 'node:test';
import OutreachUsage from '../src/models/OutreachUsage.js';
import { dispatchOutreachDrafts } from '../src/services/outreachService.js';

function configure(t, values = {}) {
  for (const [key, value] of Object.entries({ GITHUB_PAT: 'fixture', GITHUB_REPO: 'example/backend', OUTREACH_ACTIONS_ENABLED: 'true', OUTREACH_ACTIONS_FREE_CONFIRMED: 'true', ...values })) {
    const before = process.env[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    t.after(() => { if (before === undefined) delete process.env[key]; else process.env[key] = before; });
  }
  t.mock.method(OutreachUsage, 'updateOne', async () => ({}));
  t.mock.method(OutreachUsage, 'findOneAndUpdate', async () => ({ used: 1 }));
}

test('concurrent draft requests share one workflow dispatch and one usage increment', async t => {
  configure(t);
  let posts = 0;
  const request = async (_repo, endpoint, options) => {
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'production' };
    assert.deepEqual(options.body, { ref: 'production' }, 'no private candidate data in workflow events');
    posts++;
  };
  await Promise.all(Array.from({ length: 6 }, () => dispatchOutreachDrafts({ request })));
  assert.equal(posts, 1);
  assert.equal(OutreachUsage.findOneAndUpdate.mock.callCount(), 1);
});

test('missing GitHub configuration rejects before reserving allowance or accessing GitHub', async t => {
  for (const values of [{ GITHUB_PAT: undefined }, { GITHUB_REPO: 'invalid' }, { OUTREACH_ACTIONS_ENABLED: 'false' }]) {
    await t.test(JSON.stringify(values), async t => {
      configure(t, values);
      await assert.rejects(dispatchOutreachDrafts({ request: async () => assert.fail('must reject before GitHub') }), { statusCode: 503 });
      assert.equal(OutreachUsage.updateOne.mock.callCount(), 0);
    });
  }
});

test('failed workflow dispatch releases the lock for an explicit retry', async t => {
  configure(t);
  await assert.rejects(dispatchOutreachDrafts({ request: async () => { throw Error('unavailable'); } }));
  let posts = 0;
  await dispatchOutreachDrafts({ request: async (_repo, endpoint) => {
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'main' };
    posts++;
  } });
  assert.equal(posts, 1);
});
