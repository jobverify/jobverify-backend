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
    res.end(JSON.stringify({ choices: [{ finish_reason: result.reason || 'stop', message: { content: JSON.stringify({ text: result.text }) } }],
      usage: { prompt_tokens: 300, completion_tokens: 40, total_tokens: 340 }, timings: { predicted_ms: 25 } }));
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

test('rejected prose retains its actual completion and failing source fragment', async t => {
  const server = await serverFor(t, { complete: data => ({ text: data.source.replace('2 years', '10 years') }) });
  const response = await createRewriteClient(server).generate(inputFor(source));
  assert.match(response.rawText, /10 years/);
  assert.equal(response.validationFailure.diagnostic.evidence, 'At least 2 years of experience is required.');
  assert.match(response.validationFailure.diagnostic.text, /10 years/);
  assert.equal(response.validationFailure.diagnostic.code, 'numeric_relationship_changed');
});

test('malformed prose JSON retains the received completion on the error', async t => {
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    if (req.url === '/apply-template') return res.end(JSON.stringify({ prompt: 'source prompt' }));
    if (req.url === '/tokenize') return res.end(JSON.stringify({ tokens: [1, 2] }));
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"text":"unfinished' } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  await assert.rejects(createRewriteClient({ endpoint: `http://127.0.0.1:${server.address().port}` }).generate(inputFor(source)),
    error => error.rawText === '{"text":"unfinished');
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

test('prose reports per-generation tokens, timings and source offsets on failures', async t => {
  const server = await serverFor(t, { complete: data => ({ text: data.source.replace('2 years', '10 years') }) });
  const response = await createRewriteClient(server).generate(inputFor(source));
  assert.equal(response.usage.completion_tokens, 40);
  assert.equal(response.timings.predicted_ms, 25);
  assert.equal(response.generations.length, 1);
  assert.equal(response.generations[0].sourceOffset, 0);
  assert.equal(response.generations[0].finishReason, 'stop');
  assert.ok(response.generations[0].durationMs >= 0);
});

test('validated source chunks survive client restart without publishing partial work', async t => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prose-partial-cache-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  let rejectSecond = true;
  const server = await serverFor(t, { tokens: prompt => prompt.length > 5000 ? 7500 : 1000,
    complete: (data, _request, count) => {
      if (rejectSecond && count === 2) return { text: '' };
      return { text: data.source.replaceAll('Build reliable', 'Develop reliable') };
    } });
  const input = inputFor('Responsibilities:\n' + 'Build reliable Python services. '.repeat(200));
  const first = await createRewriteClient({ ...server, planCacheDir: dir }).generate(input);
  assert.equal(first.value, null);
  assert.equal(first.validationFailure.reason, 'empty_output');
  const firstChunk = JSON.parse(server.requests[0].messages.at(-1).content).source;
  const previous = server.requests.length;
  rejectSecond = false;
  const resumed = await createRewriteClient({ ...server, planCacheDir: dir }).generate(input);
  assert.equal(resumed.finishReason, 'stop');
  assert.equal(validateProseRewrite(resumed.value, input, 'stop').ok, true);
  assert.equal(resumed.value.parts.map(part => part.source).join(''), proseSource(input));
  assert.ok(server.requests.slice(previous).every(request => JSON.parse(request.messages.at(-1).content).source !== firstChunk));
  assert.ok(resumed.reusedChunks > 0);
});

test('malformed text types are generation rejections with useful diagnostics', async t => {
  const server = await serverFor(t, { complete: () => ({ text: 42 }) });
  const response = await createRewriteClient(server).generate(inputFor(source));
  assert.equal(response.validationFailure.reason, 'empty_output');
  assert.equal(response.validationFailure.diagnostic.code, 'empty_output');
  assert.match(response.rawText, /42/);
});

test('runaway repetitive streams stop with a preview and cannot publish', async t => {
  const server = await serverFor(t, { stream: true,
    complete: () => ({ text: 'Build reliable services and maintain automated tests. '.repeat(300) }) });
  const input = inputFor('Build reliable services and maintain automated tests.');
  const response = await createRewriteClient(server).generate(input);
  assert.equal(response.value, null);
  assert.equal(response.validationFailure.reason, 'repetitive_output');
  assert.match(response.rawText, /Build reliable services/);
  assert.equal(response.generationRequests, 1);
  assert.equal(response.generations[0].finishReason, 'repetitive_output');
});

test('physical context splitting inside a sentence does not create false source omissions', () => {
  const source = 'Develop Python services and maintain reliable automated tests for customers across global systems without compromising reliability.';
  const input = inputFor(source);
  const pieces = splitProseSource(source);
  const result = validateProseRewrite({ inputHash: input.inputHash, parts: pieces.map(source => ({ source, text: source })) }, input, 'stop');
  assert.equal(result.ok, true);
});

test('an explicit request timeout retains the partial stream completion', async t => {
  const server = http.createServer(async (req, res) => {
    for await (const chunk of req) { /* drain the local request */ }
    if (req.url === '/apply-template') return res.end(JSON.stringify({ prompt: 'source' }));
    if (req.url === '/tokenize') return res.end(JSON.stringify({ tokens: [1, 2] }));
    res.setHeader('Content-Type', 'text/event-stream');
    res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: '{"text":"partial' } }] }) + '\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  await assert.rejects(createRewriteClient({ endpoint: `http://127.0.0.1:${server.address().port}`, requestMs: 250 }).generate(inputFor(source)),
    error => error.name === 'TimeoutError' && error.rawText === '{"text":"partial');
});

test('persistent prose cache survives a random worker alias change', async t => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prose-stable-alias-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const server = await serverFor(t);
  const input = inputFor(source);
  await createRewriteClient({ ...server, model: 'worker-alias-one', planCacheDir: dir }).generate(input);
  const result = await createRewriteClient({ ...server, model: 'worker-alias-two', planCacheDir: dir }).generate(input);
  assert.equal(result.cachedModelPlan, true);
  assert.equal(result.generationRequests, 0);
  assert.equal(server.requests.length, 1);
});

test('identical effective source reuses cache while binding the current job input hash', async t => {
  const server = await serverFor(t);
  const client = createRewriteClient(server);
  const first = inputFor(source);
  const second = buildRewriteInput({ title: 'Senior Engineer', company: 'Another employer', sourceDescription: source });
  assert.notEqual(first.inputHash, second.inputHash);
  await client.generate(first);
  const result = await client.generate(second);
  assert.equal(result.cachedModelPlan, true);
  assert.equal(result.value.inputHash, second.inputHash);
  assert.equal(validateProseRewrite(result.value, second, 'stop').ok, true);
  assert.equal(validateProseRewrite(result.value, first, 'stop').ok, false);
  assert.equal(server.requests.length, 1);
});

test('source facts added to the effective prompt cannot reuse a different location cache', async t => {
  const server = await serverFor(t), client = createRewriteClient(server);
  await client.generate(buildRewriteInput({ title: 'Engineer', sourceDescription: source, location: 'Pune' }));
  const result = await client.generate(buildRewriteInput({ title: 'Engineer', sourceDescription: source, location: 'Mumbai' }));
  assert.equal(server.requests.length, 2);
  assert.equal(result.cachedModelPlan, undefined);
});

test('simultaneous identical sources share one inference and preserve every job hash', async t => {
  const server = await serverFor(t, { complete: async data => {
    await new Promise(resolve => setTimeout(resolve, 30));
    return { text: data.source.replace('Build reliable', 'Develop reliable') };
  } });
  const client = createRewriteClient(server);
  const inputs = Array.from({ length: 4 }, (_v, index) => buildRewriteInput({ title: 'Engineer ' + index, sourceDescription: source }));
  const results = await Promise.all(inputs.map(input => client.generate(input)));
  assert.equal(server.requests.length, 1);
  assert.equal(results.reduce((sum, result) => sum + result.generationRequests, 0), 1);
  assert.equal(results.filter(result => result.sharedGeneration).length, 3);
  for (const [index, result] of results.entries()) assert.equal(validateProseRewrite(result.value, inputs[index], 'stop').ok, true);
});

test('one cancelled duplicate cannot abort another job waiting for the same inference', async t => {
  let began;
  const started = new Promise(resolve => { began = resolve; });
  const server = await serverFor(t, { complete: async data => {
    began(); await new Promise(resolve => setTimeout(resolve, 50));
    return { text: data.source };
  } });
  const client = createRewriteClient(server), controller = new AbortController();
  const first = client.generate(inputFor(source), { signal: controller.signal });
  const rejected = assert.rejects(first, error => error.name === 'AbortError');
  await started;
  const second = client.generate(inputFor(source));
  controller.abort();
  await rejected;
  const result = await second;
  assert.equal(result.finishReason, 'stop');
  assert.equal(server.requests.length, 1);
  assert.equal(result.generationRequests, 1);
});

test('refresh mode measures fresh inference even when an accepted rewrite is cached', async t => {
  const server = await serverFor(t), client = createRewriteClient(server), input = inputFor(source);
  await client.generate(input);
  const fresh = await client.generate(input, { cacheMode: 'refresh' });
  assert.equal(fresh.generationRequests, 1);
  assert.equal(fresh.cachedModelPlan, undefined);
  assert.equal(server.requests.length, 2);
  const cached = await client.generate(input);
  assert.equal(cached.generationRequests, 0);
  assert.equal(server.requests.length, 2);
});

test('cancelling every duplicate removes the abandoned work and permits a fresh request', async t => {
  let began;
  const started = new Promise(resolve => { began = resolve; });
  const server = await serverFor(t, { complete: async data => {
    began(); await new Promise(resolve => setTimeout(resolve, 50)); return { text: data.source };
  } });
  const client = createRewriteClient(server), first = new AbortController(), second = new AbortController();
  const a = client.generate(inputFor(source), { signal: first.signal });
  const b = client.generate(inputFor(source), { signal: second.signal });
  const rejected = Promise.all([assert.rejects(a, error => error.name === 'AbortError'), assert.rejects(b, error => error.name === 'AbortError')]);
  await started; first.abort(); second.abort(); await rejected;
  const result = await client.generate(inputFor(source));
  assert.equal(validateProseRewrite(result.value, inputFor(source), 'stop').ok, true);
  assert.equal(server.requests.length, 2);
});

test('a corrupt persistent cache is revalidated instead of publishing altered content', async t => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prose-corrupt-cache-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const server = await serverFor(t), input = inputFor(source);
  await createRewriteClient({ ...server, planCacheDir: dir }).generate(input);
  const name = (await fs.readdir(dir)).find(name => name.endsWith('.json'));
  const file = path.join(dir, name), value = JSON.parse(await fs.readFile(file, 'utf8'));
  value.parts[0].text = 'Invented Java responsibilities.';
  await fs.writeFile(file, JSON.stringify(value));
  const result = await createRewriteClient({ ...server, planCacheDir: dir }).generate(input);
  assert.equal(server.requests.length, 2);
  assert.equal(result.cachedModelPlan, undefined);
  assert.equal(validateProseRewrite(result.value, input, 'stop').ok, true);
});

test('a duplicate timeout before the first response frame does not double-count inference', async t => {
  const server = await serverFor(t, { complete: async data => {
    await new Promise(resolve => setTimeout(resolve, 150)); return { text: data.source };
  } });
  const client = createRewriteClient(server), input = inputFor(source);
  let timeout;
  const first = client.generate(input, { remainingMs: 80 });
  const rejected = assert.rejects(first, error => { timeout = error; return error.name === 'TimeoutError'; });
  const survivor = client.generate(input, { remainingMs: 1000 });
  await rejected;
  const result = await survivor;
  assert.equal(timeout.generationRequests, 0);
  assert.equal(result.generationRequests, 1);
  assert.equal(server.requests.length, 1);
});
