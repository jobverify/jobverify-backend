import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTailoredResume, drainGenerationQueues } from '../outreach/runner.js';
const output = { name: 'Asha Rao', contact: '', summary: 'React project experience.', skills: ['React'], experience: [], projects: ['Built a task manager.'], education: [] };
const withTokenization = generate => async (url, options) => {
  if (url.endsWith('/apply-template')) return { ok: true, json: async () => ({ prompt: 'Templated candidate prompt' }) };
  if (url.endsWith('/tokenize')) return { ok: true, json: async () => ({ tokens: [1, 2, 3] }) };
  return generate(url, options);
};

test('combined prompt and output tokens must fit the configured model context', async () => {
  let generated = false;
  await assert.rejects(generateTailoredResume({ resumeText: 'Asha Rao', job: {} }, { fetchImpl: async url => {
    if (url.endsWith('/apply-template')) return { ok: true, json: async () => ({ prompt: 'Templated candidate prompt' }) };
    if (url.endsWith('/tokenize')) return { ok: true, json: async () => ({ tokens: Array(7000).fill(1) }) };
    generated = true; return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] }) };
  } }), /shorter resume/);
  assert.equal(generated, false);
});

test('local resume generation uses its own strict schema and bounded model budget', async () => {
  let sent;
  const result = await generateTailoredResume({ resumeText: 'Asha Rao built a React task manager.', job: { title: 'React Engineer' } }, { remainingMs: 30000,
    fetchImpl: withTokenization(async (url, options) => { assert.equal(url, 'http://127.0.0.1:8769/v1/chat/completions'); sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] }) }; }) });
  assert.deepEqual(result, output);
  assert.equal(sent.max_tokens, 2200);
  assert.equal(sent.response_format.json_schema.name, 'tailored_resume');
  assert.match(sent.messages[0].content, /Never invent/);
});
test('truncated model output and network errors cannot produce a successful resume', async () => {
  for (const fetchImpl of [async () => { throw Error('private prompt'); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(output) } }] }) })]) {
    await assert.rejects(generateTailoredResume({ resumeText: 'Asha Rao', job: {} }, { fetchImpl: withTokenization(fetchImpl) }), /unavailable|incomplete|interrupted/i);
  }
});
test('shared queue processes at most three tasks fairly under one deadline', async () => {
  const queues = { draft: [{ createdAt: new Date(2) }, { createdAt: new Date(5) }], resume: [{ updatedAt: new Date(1) }, { updatedAt: new Date(3) }] };
  const order = [];
  const result = await drainGenerationQueues({
    nextDraft: async () => queues.draft[0], nextResume: async () => queues.resume[0],
    runDraft: async () => { order.push('draft'); queues.draft.shift(); return { attempted: 1, completed: 1, failed: 0 }; },
    runResume: async () => { order.push('resume'); queues.resume.shift(); return { attempted: 1, completed: 1, failed: 0 }; },
    maxTasks: 100,
  });
  assert.deepEqual(order, ['resume', 'draft', 'resume']);
  assert.equal(result.attempted, 3);
});
