import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildRewriteInput, REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';
import { createRewriteClient, rewriteCandidates } from '../rewriting/runner.js';
import { proseSource, splitProseSource, validateProseRewrite } from '../rewriting/prose.js';

const source = 'Responsibilities:\nBuild reliable Python applications for customers and maintain automated tests.\nRequirements:\nAt least 2 years of experience is required. AWS experience is preferred.';
const inputFor = sourceDescription => buildRewriteInput({ title: 'Engineer', company: 'Example', sourceDescription });
const serverFor = async (t, { tokens = () => 300, complete, stream = false } = {}) => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    const request = JSON.parse(body);
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/apply-template') return res.end(JSON.stringify({ prompt: JSON.stringify(request.messages) }));
    if (req.url === '/tokenize') return res.end(JSON.stringify({ tokens: Array(tokens(request.content)).fill(1) }));
    requests.push(request);
    const data = JSON.parse(request.messages.at(-1).content);
    const result = await complete?.(data, request, requests.length) || { text: data.source.replace('Build reliable', 'Develop reliable'), reason: 'stop' };
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      return res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: JSON.stringify({ text: result.text }) }, finish_reason: result.reason || 'stop' }] }) + '\n\ndata: [DONE]\n\n');
    }
    res.end(JSON.stringify({ choices: [{ finish_reason: result.reason || 'stop', message: { content: JSON.stringify({ text: result.text }) } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { endpoint: `http://127.0.0.1:${server.address().port}`, requests };
};

test('production accepts short and large source text without text-size eligibility ceilings', () => {
  assert.equal(inputFor('Build services.').eligible, true);
  assert.equal(inputFor('Build services. '.repeat(5000)).eligible, true);
  assert.equal(inputFor('<p> </p>').eligible, false);
});

test('production rephrases source prose and publishes through the existing guarded update', async t => {
  const server = await serverFor(t);
  const input = inputFor(source);
  let saved;
  const stats = await rewriteCandidates([{ _id: 'prose', status: 'active', title: 'Engineer', company: 'Example', sourceDescription: source,
    sourceContentHash: input.inputHash, descriptionRewrite: { status: 'pending', inputHash: input.inputHash } }], {
    client: createRewriteClient(server), deadline: Date.now() + 10000,
    update: async (_filter, update) => { saved = update; return { matchedCount: 1 }; },
  });
  assert.equal(REWRITE_MODEL.outputFormat, 'prose');
  assert.equal(stats.published, 1);
  assert.match(saved.$set.description, /Develop reliable Python/);
  assert.match(saved.$set.description, /2 years/);
  assert.equal(saved.$set.sourceDescription, undefined);
  assert.equal(server.requests[0].max_tokens, REWRITE_MODEL.contextTokens - 300 - 64);
});

test('dense and oversized source is chunked without losing text or imposing an aggregate output cap', async t => {
  const server = await serverFor(t, { tokens: prompt => prompt.length > 4500 ? 7500 : 1000 });
  const input = inputFor('Responsibilities:\n' + 'Build reliable customer services and maintain automated tests. '.repeat(600));
  const response = await createRewriteClient(server).generate(input, { remainingMs: 30000 });
  assert.equal(response.finishReason, 'stop');
  assert.ok(server.requests.length > 1);
  assert.ok(response.value.parts.map(p => p.source).join('').length > 24000);
  assert.ok(response.value.parts.map(p => p.text).join('').length > 24000);
});

test('token-truncated output splits and retries the complete source rather than publishing a prefix', async t => {
  const server = await serverFor(t, { complete: (data, _request, count) => count === 1 ? { text: 'partial', reason: 'length' } : { text: data.source } });
  const response = await createRewriteClient(server).generate(inputFor(source));
  assert.equal(response.finishReason, 'stop');
  assert.ok(server.requests.length > 1);
  assert.equal(response.value.parts.map(p => p.source).join(''), source);
  assert.ok(response.value.parts.every(p => p.text !== 'partial'));
});

test('changed factual numbers cannot be published', async t => {
  const server = await serverFor(t, { complete: data => ({ text: data.source.replace('2 years', '10 years') }) });
  const response = await createRewriteClient(server).generate(inputFor(source));
  assert.equal(response.validationFailure?.reason, 'numeric_relationship_changed');
});

test('all chunks share cancellation and cannot return partial success', async t => {
  const controller = new AbortController();
  const server = await serverFor(t, { complete: data => { controller.abort(); return { text: data.source }; } });
  await assert.rejects(createRewriteClient(server).generate(inputFor(source), { signal: controller.signal }), error => error.name === 'AbortError');
});

test('comparison thresholds and encoded HTML retain employer text', () => {
  const input = inputFor('Requirements:\nLatency &lt; 100 ms and throughput &gt; 200 requests per second.\nMaintain &lt;strong&gt;reliable&lt;/strong&gt; systems.');
  assert.match(proseSource(input), /Latency < 100 ms and throughput > 200/);
  assert.match(proseSource(input), /Maintain reliable systems/);
});

test('literal technical generic types survive source cleaning and validation', () => {
  const input = inputFor('Maintain C++ vector<T> utilities and compare values < 100 when testing services.');
  assert.match(proseSource(input), /vector<T>/);
  assert.equal(validateProseRewrite({ inputHash: input.inputHash, parts: [{ source: proseSource(input), text: proseSource(input) }] }, input, 'stop').ok, true);
});

test('application anchor destinations survive HTML cleanup', () => {
  const input = inputFor('Build services. Apply <a href="https://example.com/jobs/engineer">through our careers site</a>.');
  assert.match(proseSource(input), /through our careers site \(https:\/\/example.com\/jobs\/engineer\)/);
});

test('required and preferred technologies cannot exchange scope while retaining both keywords', () => {
  const input = inputFor('Requirements:\nPython is required. AWS is preferred.');
  const result = validateProseRewrite({ inputHash: input.inputHash, parts: [{ source: proseSource(input), text: 'Requirements:\nPython is preferred. AWS is required.' }] }, input, 'stop');
  assert.equal(result.ok, false);
});

test('source splitting preserves complete Unicode text without broken surrogate pairs', () => {
  const source = '🛠️'.repeat(100);
  const pieces = splitProseSource(source);
  assert.equal(pieces.join(''), source);
  assert.ok(pieces.every(piece => piece.isWellFormed()));
});

test('missing source suffixes cannot pass final validation', () => {
  const input = inputFor(source);
  assert.equal(validateProseRewrite({ inputHash: input.inputHash, parts: [{ source: 'Responsibilities:', text: 'Responsibilities:' }] }, input, 'stop').reason, 'incomplete_source');
});

test('a changed source hash cannot reuse a completed rewrite', () => {
  const input = inputFor(source);
  assert.equal(validateProseRewrite({ inputHash: 'wrong', parts: [{ source, text: source }] }, input, 'stop').reason, 'incomplete_source');
});

test('required, preferred, negated statements and application URLs retain their scope', async t => {
  for (const [original, rewrite, reason] of [
    ['Python is required.', 'Python is optional.', 'required_scope_changed'],
    ['AWS is preferred.', 'AWS is useful.', 'preferred_scope_changed'],
    ['Visa sponsorship is not available.', 'Visa sponsorship is available.', 'negation_changed'],
    ['Apply at https://example.com/job', 'Apply at https://other.example/job', 'application_url_changed'],
  ]) {
    const server = await serverFor(t, { complete: () => ({ text: rewrite }) });
    const response = await createRewriteClient(server).generate(inputFor(original));
    assert.equal(response.validationFailure?.reason, reason);
  }
});

test('validated prose caches survive restart and never apply to changed source', async t => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prose-cache-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const server = await serverFor(t);
  const options = { ...server, planCacheDir: dir }, input = inputFor(source);
  await createRewriteClient(options).generate(input);
  const cached = await createRewriteClient(options).generate(input);
  assert.equal(cached.cachedModelPlan, true);
  assert.equal(cached.generationRequests, 0);
  assert.equal(server.requests.length, 1);
  await createRewriteClient(options).generate(inputFor(source.replace('2 years', '3 years')));
  assert.equal(server.requests.length, 2);
});

test('explicit timeouts never return partial success', async t => {
  const server = await serverFor(t, { complete: async data => { await new Promise(resolve => setTimeout(resolve, 60)); return { text: data.source }; } });
  await assert.rejects(createRewriteClient({ ...server, requestMs: 20 }).generate(inputFor(source)), error => error.name === 'TimeoutError');
});

test('prose streaming has no application character ceiling', async t => {
  // The fake tokenizer deliberately lets a large frame through, independently
  // testing parser ceilings rather than asserting native context capacity.
  const server = await serverFor(t, { stream: true });
  const response = await createRewriteClient(server).generate(inputFor('Build reliable services. '.repeat(5000)));
  assert.equal(response.finishReason, 'stop');
  assert.ok(response.value.parts[0].text.length > 100000);
});
