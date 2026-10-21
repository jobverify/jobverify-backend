import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import OutreachUsage from '../src/models/OutreachUsage.js';
import { dispatchTailoredResumes, tailoredResumeActionsConfigured } from '../src/services/resumeTailoringWorkflow.js';

function configure(t, values = {}) {
  const config = { GITHUB_PAT: 'test-token-only', GITHUB_REPO: 'example/backend', OUTREACH_ACTIONS_ENABLED: 'false', OUTREACH_ACTIONS_FREE_CONFIRMED: 'false',
    TAILORED_RESUME_ACTIONS_ENABLED: 'true', TAILORED_RESUME_ACTIONS_MONTHLY_RUN_LIMIT: '10', ...values };
  for (const [key, value] of Object.entries(config)) {
    const before = process.env[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    t.after(() => { if (before === undefined) delete process.env[key]; else process.env[key] = before; });
  }
  t.mock.method(OutreachUsage, 'updateOne', async () => ({}));
  t.mock.method(OutreachUsage, 'findOneAndUpdate', async () => ({ used: 1 }));
}

test('tailoring dispatches its own workflow on the default branch with no candidate data or free API gate', async t => {
  configure(t, { TAILORED_RESUME_ACTIONS_ENABLED: undefined });
  const calls = [];
  const result = await dispatchTailoredResumes({ now: new Date('2026-10-20'), request: async (repo, endpoint, options) => {
    assert.equal(repo, 'example/backend');
    calls.push({ endpoint, options });
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'production' };
    assert.equal(endpoint, '/actions/workflows/tailored-resumes.yml/dispatches');
    assert.deepEqual(options, { method: 'POST', body: { ref: 'production' } });
  } });
  assert.equal(tailoredResumeActionsConfigured(), true);
  assert.equal(result.reused, false);
  assert.equal(calls.length, 3);
  assert.match(calls[0].endpoint, /tailored-resumes\.yml\/runs/);
});

test('a waiting runner is reused, while a running worker gets a follow-up run for newly queued work', async t => {
  configure(t);
  for (const status of ['queued', 'waiting', 'pending', 'requested', 'in_progress', 'completed']) {
    let posts = 0;
    const result = await dispatchTailoredResumes({ request: async (_repo, endpoint, options) => {
      if (endpoint.includes('/runs?')) return { workflow_runs: [{ status }] };
      if (!endpoint) return { default_branch: 'main' };
      if (options?.method === 'POST') posts++;
    } });
    assert.equal(result.reused, !['in_progress', 'completed'].includes(status), status);
    assert.equal(posts, result.reused ? 0 : 1, status);
  }
});

test('simultaneous requests share one dispatch while GitHub has not listed the new run yet', async t => {
  configure(t);
  let posts = 0;
  const request = async (_repo, endpoint) => {
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'main' };
    posts++;
  };
  await Promise.all(Array.from({ length: 6 }, () => dispatchTailoredResumes({ request })));
  assert.equal(posts, 1);
});

test('missing configuration and explicit disablement reject before GitHub or quota calls', async t => {
  for (const values of [{ GITHUB_PAT: undefined }, { GITHUB_REPO: 'invalid' }, { TAILORED_RESUME_ACTIONS_ENABLED: 'false' }]) {
    await t.test(JSON.stringify(values), async t => {
      configure(t, values);
      assert.equal(tailoredResumeActionsConfigured(), false);
      await assert.rejects(dispatchTailoredResumes({ request: async () => assert.fail('GitHub must not be called') }), { statusCode: 503 });
      assert.equal(OutreachUsage.updateOne.mock.callCount(), 0);
    });
  }
});

test('the monthly Actions cap is reserved before dispatch and cannot be bypassed by retries', async t => {
  configure(t);
  t.mock.method(OutreachUsage, 'findOneAndUpdate', async filter => {
    assert.equal(filter.key, 'actions:tailored-resumes:2026-10');
    assert.equal(filter.used.$lte, 9);
    return null;
  });
  await assert.rejects(dispatchTailoredResumes({ now: new Date('2026-10-20'), request: async (_repo, endpoint, options) => {
    assert.notEqual(options?.method, 'POST');
    return endpoint ? { workflow_runs: [] } : { default_branch: 'main' };
  } }), error => error.statusCode === 429 && /resume.*allowance/i.test(error.message));
});

test('invalid GitHub responses and failed dispatches are retryable and do not leak upstream details', async t => {
  configure(t);
  for (const request of [async () => ({}), async (_repo, endpoint) => endpoint ? { workflow_runs: [] } : {}, async () => { throw Error('private upstream response'); }]) {
    await assert.rejects(dispatchTailoredResumes({ request }), error => error.statusCode >= 500 && !/private upstream/.test(error.message));
  }
  let posts = 0;
  await dispatchTailoredResumes({ request: async (_repo, endpoint) => {
    if (endpoint.includes('/runs?')) return { workflow_runs: [] };
    if (!endpoint) return { default_branch: 'main' };
    posts++;
  } });
  assert.equal(posts, 1, 'a rejected dispatch must release the in-process lock');
});

test('dedicated workflow runs local inference without outreach enablement, inference APIs or private artifacts', async () => {
  const workflow = await readFile(new URL('../.github/workflows/tailored-resumes.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: jobverify-tailored-resumes/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /timeout-minutes: 30/);
  assert.match(workflow, /Qwen3-4B-Instruct-2507-Q4_K_M/);
  assert.match(workflow, /\.cache\/resume-compiler\/image.tar/);
  assert.doesNotMatch(workflow, /LFM2.5/);
  assert.match(workflow, /secrets\.MONGO_URI/);
  assert.match(workflow, /node scripts\/runTailoredResumes\.js/);
  assert.doesNotMatch(workflow, /OUTREACH_ACTIONS|upload-artifact|GITHUB_PAT|INFERENCE_API|OPENAI_API/);
  const outreach = await readFile(new URL('../scripts/runOutreachDrafts.js', import.meta.url), 'utf8');
  assert.doesNotMatch(outreach, /TailoredResume|drainGenerationQueues/);
});
