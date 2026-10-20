import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDraftPrompt, validateGeneratedDraft, completeDraftTask } from '../src/services/outreachDrafting.js';
import OutreachThread from '../src/models/OutreachThread.js';
import OutreachTask from '../src/models/OutreachTask.js';
import User from '../src/models/User.js';
import { readFile } from 'node:fs/promises';
import { generateOutreachDraft, OUTREACH_MODEL } from '../outreach/runner.js';
const user = '507f1f77bcf86cd799439011';
const task = { _id: '507f1f77bcf86cd799439012', user, thread: '507f1f77bcf86cd799439013', leaseOwner: 'worker', input: { revision: 2, profile: { name: 'Candidate', aboutYou: 'React developer', experienceProjects: 'Built a weather app' }, jobSnapshot: { title: 'Engineer', company: 'Example' }, contact: { name: 'Jane Doe', kind: 'likely_contact' } } };
test('prompt restricts experience and relationship claims and wraps context as untrusted data', () => {
  const prompt = buildDraftPrompt(task.input);
  assert.match(prompt, /untrusted/i);
  assert.match(prompt, /never invent/i);
  assert.match(prompt, /likely_contact/);
  assert.match(prompt, /weather app/);
});
test('generated drafts must be bounded complete JSON and exclude email header injection', () => {
  const valid = { linkedin: 'Hello Jane', emailSubject: 'Engineer role', emailBody: 'Hello Jane, I built a weather app.' };
  assert.deepEqual(validateGeneratedDraft(JSON.stringify(valid)), valid);
  assert.throws(() => validateGeneratedDraft('not json'));
  assert.throws(() => validateGeneratedDraft({ ...valid, emailSubject: 'Role\r\nBcc: victim@example.com' }));
  assert.throws(() => validateGeneratedDraft({ ...valid, linkedin: '' }));
});
test('late workflow writes require matching thread revision and leave edited drafts untouched', async t => {
  t.mock.method(OutreachTask, 'exists', async () => ({}));
  t.mock.method(User, 'exists', async filter => { assert.equal(String(filter._id), user); return {}; });
  t.mock.method(OutreachThread, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.revision, 2);
    assert.equal(filter.user, user);
    assert.equal(update.$inc.revision, 1);
    return null;
  });
  t.mock.method(OutreachTask, 'updateOne', async (filter, update) => {
    assert.equal(filter.leaseOwner, 'worker');
    assert.equal(update.$set.status, 'failed');
    assert.match(update.$set.error, /changed/i);
    assert.equal(update.$unset.activeKey, 1);
  });
  assert.equal(await completeDraftTask(task, { linkedin: 'Hello', emailSubject: 'Role', emailBody: 'Hello' }), false);
});
test('deleted users receive no regenerated private content', async t => {
  t.mock.method(User, 'exists', async () => null);
  t.mock.method(OutreachThread, 'findOneAndUpdate', async () => assert.fail('must not recreate data'));
  t.mock.method(OutreachTask, 'deleteOne', async filter => { assert.equal(filter._id, task._id); });
  assert.equal(await completeDraftTask(task, {}), false);
});
test('local generator uses strict structured output and rejects truncated completions', async () => {
  const draft = { linkedin: 'Hello Jane', emailSubject: 'Engineer role', emailBody: 'I built a weather app.' };
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8769/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.stream, false);
    assert.match(body.messages[0].content, /weather app/);
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(draft) } }] }) };
  };
  assert.deepEqual(await generateOutreachDraft(task.input, { fetchImpl }), draft);
  await assert.rejects(generateOutreachDraft(task.input, { fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(draft) } }] }) }) }), /incomplete/);
});
test('workflow pins an isolated model and bounds compute without caching candidate data', async () => {
  assert.equal(OUTREACH_MODEL.modelId, 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF');
  assert.match(OUTREACH_MODEL.revision, /^[a-f0-9]{40}$/);
  assert.match(OUTREACH_MODEL.sha256, /^[a-f0-9]{64}$/);
  const workflow = await readFile(new URL('../.github/workflows/outreach-drafts.yml', import.meta.url), 'utf8');
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(workflow, /group: jobverify-outreach-drafts/);
  assert.match(workflow, /path: \.cache\/outreach-models/);
  assert.doesNotMatch(workflow, /upload-artifact|outreach-plans|description-rewriter|npm.*cache/);
});
test('an expired or replaced lease cannot publish generated content', async t => {
  t.mock.method(User, 'exists', async () => ({}));
  t.mock.method(OutreachTask, 'exists', async () => null);
  t.mock.method(OutreachThread, 'findOneAndUpdate', async () => assert.fail('lost lease cannot write drafts'));
  assert.equal(await completeDraftTask(task, { linkedin: 'Hello', emailSubject: 'Role', emailBody: 'Hello' }), false);
});
