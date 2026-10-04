import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRewriteClient, rewriteCandidates, rewriteDeadline } from '../rewriting/runner.js';
import { buildRewriteInput } from '../src/services/jobDescriptionPolicy.js';

const source = 'Role overview: Build Python services for customer applications. Responsibilities: Design reliable APIs and maintain Python services. Required qualifications: At least 2 years of software development experience is required. Preferred qualifications: AWS experience is nice to have.';
const job = { _id: 'job1', title: 'Software Engineer', company: 'Example', sourceDescription: source, status: 'active', descriptionRewrite: { status: 'pending', attempts: 0 } };
job.descriptionRewrite.inputHash = buildRewriteInput(job).inputHash;
const valid = { sections: [['overview', 'Build Python services for customer applications.'], ['responsibilities', 'Design reliable APIs and maintain Python services.'], ['required_qualifications', 'At least 2 years of software development experience is required.'], ['preferred', 'AWS experience is nice to have.']].map(([key, text]) => ({ key, items: [{ text, evidence: text, style: 'paragraph' }] })) };

test('local generation uses structured output and detects truncated HTTP completions', async t => {
  let request;
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    request = JSON.parse(body);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(valid) } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const client = createRewriteClient({ endpoint: 'http://127.0.0.1:' + server.address().port, model: 'test-model' });
  const output = await client.generate(buildRewriteInput(job));
  assert.equal(output.finishReason, 'length');
  assert.equal(request.response_format.type, 'json_schema');
  assert.equal(request.model, 'test-model');
  assert.match(request.messages[0].content, /verbatim evidence/);
  assert.doesNotMatch(JSON.stringify(request.messages), /API_KEY/);
});

test('generation client rejects non-local endpoints', () => {
  assert.throws(() => createRewriteClient({ endpoint: 'https://example.com' }), /127\.0\.0\.1/);
});

test('run budget respects the workflow deadline and cleanup reserve', () => {
  assert.equal(rewriteDeadline({ now: 100000, budgetSeconds: 1200, workflowStartedAt: new Date(0).toISOString(), workflowSeconds: 150, cleanupSeconds: 20 }), 130000);
  assert.equal(rewriteDeadline({ now: 100000, budgetSeconds: 0 }), 100000);
});

test('publishing is guarded by current source hash and never modifies source or filter fields', async () => {
  const input = buildRewriteInput(job), stored = { ...job, sourceContentHash: input.inputHash };
  let update;
  const stats = await rewriteCandidates([stored], {
    client: { generate: async () => ({ value: valid, finishReason: 'stop' }) },
    update: async (filter, values) => { update = { filter, values }; return { matchedCount: 1 }; }, deadline: Date.now() + 10000,
  });
  assert.equal(stats.published, 1);
  assert.equal(update.filter.sourceContentHash, input.inputHash);
  assert.equal(update.filter.status, 'active');
  assert.equal(update.values.$set.descriptionFormat, 'markdown');
  assert.match(update.values.$set.description, /## Role overview/);
  assert.equal(update.values.$set.sourceDescription, undefined);
  assert.equal(update.values.$set.experienceYears, undefined);
});

test('a concurrent source change skips publication', async () => {
  const stored = { ...job, sourceContentHash: buildRewriteInput(job).inputHash };
  const stats = await rewriteCandidates([stored], { client: { generate: async () => ({ value: valid, finishReason: 'stop' }) }, update: async () => ({ matchedCount: 0 }), deadline: Date.now() + 10000 });
  assert.equal(stats.published, 0);
  assert.equal(stats.concurrentChanges, 1);
});

test('failed or truncated generation retains the visible source description and records failure', async () => {
  const stored = { ...job, sourceContentHash: buildRewriteInput(job).inputHash };
  let update;
  const stats = await rewriteCandidates([stored], { client: { generate: async () => ({ value: valid, finishReason: 'length' }) }, update: async (filter, values) => { update = values; return { matchedCount: 1 }; }, deadline: Date.now() + 10000 });
  assert.equal(stats.failed, 1);
  assert.equal(update.$set['descriptionRewrite.reason'], 'truncated');
  assert.equal(update.$set.description, undefined);
});

test('exhausted budget and cancellation leave unprocessed jobs pending', async () => {
  const stored = { ...job, sourceContentHash: buildRewriteInput(job).inputHash };
  const update = async () => { throw new Error('must not update'); };
  const client = { generate: async () => { throw new Error('must not generate'); } };
  assert.equal((await rewriteCandidates([stored], { client, update, deadline: Date.now() - 1 })).attempted, 0);
  const controller = new AbortController(); controller.abort();
  assert.equal((await rewriteCandidates([stored], { client, update, deadline: Date.now() + 10000, signal: controller.signal })).attempted, 0);
});


test('local HTTP timeout never produces a completion eligible for publication', async t => {
  const server = http.createServer((req, res) => { req.resume(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const client = createRewriteClient({ endpoint: 'http://127.0.0.1:' + server.address().port, requestMs: 25 });
  await assert.rejects(client.generate(buildRewriteInput(job)), error => error.name === 'TimeoutError');
});

test('interruption during generation leaves the current candidate pending', async () => {
  const controller = new AbortController();
  const candidate = { ...job, sourceContentHash: buildRewriteInput(job).inputHash };
  const stats = await rewriteCandidates([candidate], { signal: controller.signal, deadline: Date.now() + 10000,
    client: { generate: async () => { controller.abort(); throw new DOMException('Interrupted', 'AbortError'); } },
    update: async () => { throw new Error('must not update'); },
  });
  assert.equal(stats.interrupted, true);
  assert.equal(stats.published + stats.failed, 0);
});
