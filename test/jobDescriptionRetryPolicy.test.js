import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteCandidates } from '../rewriting/runner.js';
import { buildRewriteInput, REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';

const candidate = () => {
  const job = { _id: 'retry', status: 'active', title: 'Engineer', sourceDescription: 'Build Python services.',
    descriptionRewrite: { status: 'pending', attempts: 0, policyVersion: REWRITE_MODEL.policyVersion } };
  job.sourceContentHash = job.descriptionRewrite.inputHash = buildRewriteInput(job).inputHash;
  return job;
};

test('deterministic validation rejection waits for a policy change rather than identical hourly retries', async () => {
  let saved;
  const stats = await rewriteCandidates([candidate()], { deadline: Date.now() + 10000,
    client: { format: 'prose', generate: async () => ({ finishReason: 'stop', value: null,
      validationFailure: { ok: false, reason: 'numeric_relationship_changed' } }) },
    update: async (_filter, values) => { saved = values; return { matchedCount: 1 }; } });
  assert.equal(stats.failed, 1);
  assert.equal(saved.$set['descriptionRewrite.nextAttemptAt'], null);
  assert.equal(saved.$set.description, undefined);
});

test('transient request timeout retains delayed retry behavior', async () => {
  let saved;
  await rewriteCandidates([candidate()], { deadline: Date.now() + 10000,
    client: { generate: async () => { throw new DOMException('request timed out', 'TimeoutError'); } },
    update: async (_filter, values) => { saved = values; return { matchedCount: 1 }; } });
  assert.ok(saved.$set['descriptionRewrite.nextAttemptAt'] instanceof Date);
  assert.ok(saved.$set['descriptionRewrite.nextAttemptAt'].getTime() > Date.now() + 3500000);
});

test('a failed old-policy record receives a fresh guarded attempt budget', async () => {
  const job = candidate();
  job.descriptionRewrite = { ...job.descriptionRewrite, status: 'failed', attempts: 3, policyVersion: 'job-description-prose-v17' };
  const writes = [];
  const stats = await rewriteCandidates([job], { deadline: Date.now() + 10000,
    client: { format: 'prose', generate: async input => ({ format: 'prose', finishReason: 'stop',
      value: { inputHash: input.inputHash, parts: [{ source: job.sourceDescription, text: 'Develop Python services.' }] } }) },
    update: async (filter, values) => { writes.push({ filter, values }); return { matchedCount: 1 }; } });
  assert.equal(stats.queueRepairs, 1);
  assert.equal(stats.published, 1);
  assert.equal(writes[0].values.$set.descriptionRewrite.attempts, 0);
  assert.equal(writes[0].values.$set.descriptionRewrite.policyVersion, REWRITE_MODEL.policyVersion);
  assert.equal(writes[1].values.$inc['descriptionRewrite.attempts'], 1);
});
