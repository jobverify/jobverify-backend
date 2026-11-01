import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildRewriteInput } from '../src/services/jobDescriptionPolicy.js';
import { createRewriteClient, probeRewriteClient, rewriteCandidates, rewriteProgress } from '../rewriting/runner.js';
import { validateProseRewrite } from '../rewriting/prose.js';
import Job from '../src/models/Job.js';

const inputFor = sourceDescription => buildRewriteInput({ title: 'Engineer', company: 'Example', sourceDescription });
const serverFor = async (t, complete) => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let text = ''; for await (const part of request) text += part;
    const body = JSON.parse(text);
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/apply-template') return response.end(JSON.stringify({ prompt: JSON.stringify(body.messages) }));
    if (request.url === '/tokenize') return response.end(JSON.stringify({ tokens: [1, 2, 3] }));
    requests.push(body);
    const source = body.messages.at(-1).content;
    const completion = await complete(source, requests.length);
    response.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ text: completion }) } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { endpoint: `http://127.0.0.1:${server.address().port}`, requests };
};

test('omitted responsibilities retain their original source beside accepted model edits', async t => {
  const source = 'Role overview:\nBuild Python services.\nResponsibilities:\nMaintain automated tests.\nLocation: Pune\nTime Type: Full time';
  const server = await serverFor(t, text => text.includes('Build Python') ? 'Develop Python services.' : 'Short summary.');
  const input = inputFor(source);
  const response = await createRewriteClient(server).generate(input);
  const checked = validateProseRewrite(response.value, input, response.finishReason);
  assert.equal(checked.ok, true);
  assert.match(checked.description, /Develop Python services/);
  assert.match(checked.description, /Maintain automated tests/);
  assert.match(checked.description, /Location: Pune/);
  assert.match(checked.description, /Time Type: Full time/);
  assert.equal(checked.quality.modelEditedBlocks, 1);
  assert.equal(checked.quality.sourceFallbackBlocks, 1);
  assert.equal(checked.quality.fullSourceCoverage, true);
  assert.ok(checked.quality.protectedSourceBlocks >= 2);
  assert.equal(response.value.parts.map(part => part.source).join(''), source);
});

test('embedded position and employment metadata never depend on model generation', async t => {
  const source = 'Position: Python Engineer Job Description: Location: Pune Time Type: Full time Job Category: Engineering Services';
  const server = await serverFor(t, () => 'Python Engineer.');
  const input = inputFor(source);
  const response = await createRewriteClient(server).generate(input);
  const checked = validateProseRewrite(response.value, input, response.finishReason);
  assert.equal(checked.ok, true);
  assert.match(checked.description, /Position: Python Engineer/);
  assert.match(checked.description, /Location: Pune/);
  assert.match(checked.description, /Time Type: Full time/);
  assert.match(checked.description, /Job Category: Engineering Services/);
  assert.equal(server.requests.length, 0);
  assert.equal(response.generationRequests, 0);
  assert.equal(response.renderedWithoutInference, true);
  assert.equal(checked.quality.modelEditedBlocks, 0);
  assert.equal(checked.quality.sourceFallbackBlocks, 0);
});

test('a neutral paragraph may change line layout without losing actors or actions', async t => {
  const server = await serverFor(t, () => 'Design reliable APIs.\nMaintain automated tests.');
  const input = inputFor('Responsibilities:\nDesign reliable APIs. Maintain automated tests.');
  const response = await createRewriteClient(server).generate(input);
  const checked = validateProseRewrite(response.value, input, response.finishReason);
  assert.equal(checked.ok, true);
  assert.equal(checked.quality.sourceFallbackBlocks, 0);
  assert.match(checked.description, /Maintain automated tests/);
});

test('a model cannot leave a required heading that changes the next source block', async t => {
  const source = 'Responsibilities:\nBuild Python services.\n\nMaintain automated tests.';
  const server = await serverFor(t, text => text.includes('Build Python') ? 'Develop Python services.\n## Required qualifications' : text);
  const input = inputFor(source);
  const response = await createRewriteClient(server).generate(input);
  const checked = validateProseRewrite(response.value, input, response.finishReason);
  assert.equal(checked.ok, true);
  assert.doesNotMatch(checked.description, /Required qualifications/);
  assert.match(checked.description, /Build Python services/);
  assert.equal(checked.quality.sourceFallbackBlocks, 1);
});

test('protected numbers, negation and preferred scope remain verbatim', async t => {
  const source = 'Required qualifications:\nAt least 2 years of Python experience is required.\nPreferred qualifications:\nAWS experience is nice-to-have.\nEmployment details:\nNo visa sponsorship is available.';
  const server = await serverFor(t, () => 'At most 10 years is required. Visa sponsorship is available.');
  const input = inputFor(source);
  const response = await createRewriteClient(server).generate(input);
  const checked = validateProseRewrite(response.value, input, response.finishReason);
  assert.equal(checked.ok, true);
  assert.match(checked.description, /At least 2 years of Python experience is required/);
  assert.match(checked.description, /AWS experience is nice-to-have/);
  assert.match(checked.description, /No visa sponsorship is available/);
  assert.equal(server.requests.length, 0);
});

test('source offsets and fallback contents are revalidated before a cached value can publish', async t => {
  const server = await serverFor(t, text => text.replace('Build Python', 'Develop Python'));
  const input = inputFor('Build Python services.\nLocation: Pune');
  const response = await createRewriteClient(server).generate(input);
  assert.equal(validateProseRewrite(response.value, input, 'stop').ok, true);
  const changedOffset = structuredClone(response.value);
  changedOffset.parts[0].sourceOffset = 1;
  assert.equal(validateProseRewrite(changedOffset, input, 'stop').ok, false);
  const inventedFallback = structuredClone(response.value);
  inventedFallback.parts[0].origin = 'source_fallback';
  inventedFallback.parts[0].text = 'Build Kubernetes services for 100 customers.';
  assert.equal(validateProseRewrite(inventedFallback, input, 'stop').ok, false);
});

test('readiness cannot be satisfied by original-source fallback for rejected model output', async t => {
  const server = await serverFor(t, () => 'Invented Kubernetes duties.');
  const probe = await probeRewriteClient(createRewriteClient(server), { concurrency: 4, deadline: Date.now() + 10000 });
  assert.equal(probe.ready, false);
  assert.equal(probe.warnings, 4);
});

test('fallback output is attempted again instead of becoming a permanent accepted cache entry', async t => {
  let reject = true;
  const server = await serverFor(t, text => reject ? 'Unrelated employer text.' : text.replace('Build Python', 'Develop Python'));
  const client = createRewriteClient(server), input = inputFor('Build Python services.');
  const first = await client.generate(input);
  const firstChecked = validateProseRewrite(first.value, input, 'stop');
  assert.equal(firstChecked.ok, true);
  assert.equal(firstChecked.quality.sourceFallbackBlocks, 1);
  const previous = server.requests.length;
  reject = false;
  const second = await client.generate(input);
  const checked = validateProseRewrite(second.value, input, 'stop');
  assert.equal(checked.ok, true);
  assert.equal(checked.quality.sourceFallbackBlocks, 0);
  assert.match(checked.description, /Develop Python/);
  assert.ok(server.requests.length > previous);
});

test('published fallback metrics are persisted and counted as warnings without changing pending estimates', async t => {
  const source = 'Build Python services.';
  const server = await serverFor(t, () => 'Unrelated employer text.');
  const input = inputFor(source);
  let saved;
  const stats = await rewriteCandidates([{ _id: 'coverage', status: 'active', title: 'Engineer', company: 'Example', sourceDescription: source,
    sourceContentHash: input.inputHash, descriptionRewrite: { status: 'pending', attempts: 0, inputHash: input.inputHash } }], {
    client: createRewriteClient(server), deadline: Date.now() + 10000,
    update: async (_filter, values) => { saved = values; return { matchedCount: 1 }; },
  });
  assert.equal(stats.published, 1);
  assert.equal(stats.sourceFallbackDescriptions, 1);
  assert.equal(stats.sourceFallbackBlocks, 1);
  assert.equal(rewriteProgress({ queued: 1, ...stats }).pendingEstimate, 0);
  assert.equal(rewriteProgress({ queued: 1, ...stats }).warnings, 1);
  const stored = new Job({ descriptionRewrite: { quality: saved.$set['descriptionRewrite.quality'] } }).toObject();
  assert.equal(stored.descriptionRewrite.quality.sourceFallbackBlocks, 1);
  assert.equal(stored.descriptionRewrite.quality.fullSourceCoverage, true);
});
