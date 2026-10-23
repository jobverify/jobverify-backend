import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildRewriteInput, validateRewrite } from '../src/services/jobDescriptionPolicy.js';
import { buildSourceEdits, expandSourceEdits } from '../rewriting/editProtocol.js';
import { createRewriteClient, rewriteCandidates, rewriteStopDetails } from '../rewriting/runner.js';

const overview = 'Build Python services for customer applications.';
const duty = 'Design reliable APIs and maintain Python services.';
const inputFor = sourceDescription => buildRewriteInput({ title: 'Software Engineer', company: 'Example',
  sourceDescription: sourceDescription || `Role overview: ${overview} Responsibilities: ${duty} Required qualifications: At least 2 years of software development experience is required. Preferred qualifications: AWS experience is nice to have.` });

test('production edit schema bounds all generated prose to two short edits with no section inventories', () => {
  const input = inputFor(), protocol = buildSourceEdits(input);
  assert.equal(protocol.schema.properties.edits.maxItems, 2);
  assert.equal(protocol.schema.properties.edits.items.properties.text.maxLength, 160);
  assert.equal(protocol.schema.properties.sections, undefined);
  assert.ok(protocol.candidates.length <= 6);
  const data = JSON.parse(protocol.messages[1].content);
  assert.equal(data.sources, undefined); assert.ok(data.candidates.length <= 6);
  const expanded = expandSourceEdits({ edits: [] }, input);
  const checked = validateRewrite(expanded, input, 'stop');
  assert.equal(checked.ok, true); assert.match(checked.description, /At least 2 years/);
  assert.match(checked.description, /AWS experience is nice to have/);
});

test('candidate selection omits company sections and favors the actual job duties', () => {
  const bio = 'We create immersive entertainment for people throughout the world.';
  const input = inputFor(`About Company\n${bio}\nOur Values\nCelebrate different perspectives in everything we do.\nJob Summary\n${overview}\nResponsibilities:\n${duty}\nRequired qualifications: At least 2 years of software development experience is required.`);
  const protocol = buildSourceEdits(input), prompt = JSON.stringify(protocol.messages);
  assert.doesNotMatch(prompt, /immersive entertainment|Celebrate different perspectives/);
  assert.match(prompt, /Design reliable APIs/);
  assert.equal(validateRewrite(expandSourceEdits({ edits: [] }, input), input, 'stop').ok, true);
});

test('invalid edit IDs, long text and extra edits never enter a published description', () => {
  const input = inputFor(), protocol = buildSourceEdits(input), source = protocol.candidates[0].id;
  assert.equal(expandSourceEdits({ edits: [{ source: 999999, text: 'Invented detail.' }] }, input), null);
  assert.equal(expandSourceEdits({ edits: [{ source, text: 'a'.repeat(161) }] }, input), null);
  assert.equal(expandSourceEdits({ edits: Array.from({ length: 3 }, () => ({ source, text: overview })) }, input), null);
  const fabricated = expandSourceEdits({ edits: [{ source, text: 'Mandatory Kubernetes expertise.' }] }, input);
  assert.equal(validateRewrite(fabricated, input, 'stop').ok, false);
});

test('edits preserve all unheaded and overview duties, including actions and repeated terms', () => {
  for (const heading of ['', 'Role overview: ']) {
    const source = 'Build Python services for customer applications and maintain PostgreSQL databases for payment processing and document deployment procedures for support teams.';
    const input = inputFor(heading + source), candidate = buildSourceEdits(input).candidates.find(unit => unit.text === source);
    assert.ok(candidate);
    assert.equal(expandSourceEdits({ edits: [{ source: candidate.id, text: overview }] }, input), null);
    for (const [original, shortened] of [
      ['Build and maintain Python APIs.', 'Build Python APIs.'],
      ['Build Python APIs and document Python APIs.', 'Build Python APIs and document APIs.'],
      ['Build Python APIs and support customer teams.', 'Build Python APIs and customer teams.'],
    ]) {
      const actionInput = inputFor(heading + original), action = buildSourceEdits(actionInput).candidates.find(unit => unit.text === original);
      assert.ok(action);
      assert.equal(expandSourceEdits({ edits: [{ source: action.id, text: shortened }] }, actionInput), null);
    }
  }
});

test('formatting edits retain source wording and pass the existing evidence validator', () => {
  const input = inputFor(), candidate = buildSourceEdits(input).candidates.find(unit => unit.text === duty);
  assert.ok(candidate);
  const expanded = expandSourceEdits({ edits: [{ source: candidate.id, text: 'Design reliable APIs; and maintain Python services.' }] }, input);
  assert.equal(validateRewrite(expanded, input, 'stop').ok, true);
});

test('raw partial JSON is retained on token truncation without becoming a completion', async t => {
  const partial = '{"edits":[{"source":0,"text":"Build Python';
  const server = http.createServer(async (req, res) => {
    req.resume(); res.setHeader('Content-Type', 'application/json');
    if (req.url === '/apply-template') return res.end(JSON.stringify({ prompt: 'template' }));
    if (req.url === '/tokenize') return res.end(JSON.stringify({ tokens: [1,2,3] }));
    res.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: partial } }],
      usage: { completion_tokens: 1024 }, timings: { predicted_per_token_ms: 200, prompt_ms: 60000 } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const result = await createRewriteClient({ endpoint: 'http://127.0.0.1:' + server.address().port, requestMs: 10000 }).generate(inputFor());
  assert.equal(result.format, 'source-edits'); assert.equal(result.rawText, partial);
  assert.equal(result.value, null); assert.equal(result.finishReason, 'length');
  assert.equal(result.retrySkipped, 'insufficient_time'); assert.equal(result.generationRequests, 1);
});

test('normal budget metadata differs from external cancellation', () => {
  assert.deepEqual(rewriteStopDetails({ budgetExpired: true }), { interrupted: true, budgetExhausted: true,
    stopReason: 'budget_exhausted', reason: 'workflow_budget_exhausted' });
  assert.deepEqual(rewriteStopDetails({ budgetExpired: true, cancelled: true }), { interrupted: true,
    cancelled: true, stopReason: 'cancelled', reason: 'interrupted' });
});

test('protected-only descriptions render without a model request and report zero generated edits', async () => {
  const input = inputFor('Required qualifications: At least 2 years of Python development experience is required for applicants working on our customer software services and production applications. Preferred qualifications: AWS experience is nice to have for this role.');
  const result = await createRewriteClient({ endpoint: 'http://127.0.0.1:1' }).generate(input);
  assert.equal(result.renderedWithoutInference, true); assert.equal(result.generationRequests, 0);
  assert.equal(result.modelEditedItems, 0); assert.equal(validateRewrite(result.value, input, result.finishReason).ok, true);
});

test('a programming failure remains fatal when it coincides with cancellation', async () => {
  const input = inputFor(), controller = new AbortController(), bug = new TypeError('injected code failure');
  const job = { _id: 'fatal-at-stop', title: input.facts.title, company: input.facts.company, sourceDescription: input.sourceDescription,
    status: 'active', sourceContentHash: input.inputHash, descriptionRewrite: { status: 'pending', attempts: 0, inputHash: input.inputHash } };
  await assert.rejects(rewriteCandidates([job], { signal: controller.signal, deadline: Date.now() + 10000,
    client: { generate: async () => { controller.abort(); throw bug; } },
    update: async () => assert.fail('A code failure must not save an item warning') }), error => error === bug);
});

test('incomplete SSE streams retain received model text for diagnostics', async t => {
  const partial = '{"edits":[{"source":0,"text":"Build';
  const server = http.createServer((req, res) => {
    req.resume();
    if (req.url === '/apply-template' || req.url === '/tokenize') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(req.url === '/apply-template' ? { prompt: 'template' } : { tokens: [1,2,3] }));
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: partial }, finish_reason: null }] }) + '\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  await assert.rejects(createRewriteClient({ endpoint: 'http://127.0.0.1:' + server.address().port }).generate(inputFor()),
    error => error.name === 'RewriteGenerationError' && error.rawText === partial && error.generationRequests === 1);
});
