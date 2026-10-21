import assert from 'node:assert/strict';
import test from 'node:test';
import { searchReferralWeb, rankReferralContacts } from '../outreach/referralSearch.js';

const context = { company: 'Example Corp', title: 'Frontend Engineer', department: 'Engineering', location: 'Pune', description: 'Public job description' };
const contacts = Array.from({ length: 4 }, (_, index) => ({ name: `Person ${index}`, title: 'Frontend Engineer at Example Corp', sourceUrl: `https://www.linkedin.com/in/person-${index}`, evidence: 'An employee on the frontend team at Example Corp.', kind: 'likely_contact', email: '', emailStatus: 'unavailable' }));
const response = data => ({ ok: true, json: async () => data });

test('referral web search uses the loopback SearXNG JSON API with bounded results and no API key', async () => {
  let calls = 0;
  const result = await searchReferralWeb(context, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:8780/search');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    const query = new URLSearchParams(options.body);
    assert.equal(query.get('format'), 'json');
    assert.match(query.get('q'), /Example Corp/);
    assert.match(query.get('q'), /referral/i);
    assert.equal(options.headers.Authorization, undefined);
    assert.ok(options.signal);
    return response({ results: Array.from({ length: 20 }, (_, n) => ({ title: `Person ${n}`, content: 'Public source', url: `https://example.com/person-${n}` })), unresponsive_engines: [] });
  } });
  assert.equal(calls, 1);
  assert.equal(result.length, 12);
});

test('upstream search failures do not become a successful empty discovery', async () => {
  await assert.rejects(searchReferralWeb(context, { fetchImpl: async () => response({ results: [], unresponsive_engines: [['brave', 'CAPTCHA'], ['duckduckgo', 'timeout']] }) }), /unavailable|blocked|retry/i);
  await assert.rejects(searchReferralWeb(context, { fetchImpl: async () => ({ ok: false, status: 500 }) }), /unavailable|retry/i);
  await assert.rejects(searchReferralWeb(context, { fetchImpl: async () => response({ results: 'not an array' }) }), /invalid/i);
});

test('healthy searches without matching results are bounded and remain empty', async () => {
  let calls = 0;
  assert.deepEqual(await searchReferralWeb(context, { fetchImpl: async () => { calls++; return response({ results: [], unresponsive_engines: [] }); } }), []);
  assert.ok(calls <= 2);
});

test('the local model can only select original, evidence-backed contacts', async () => {
  const ranked = await rankReferralContacts(context, contacts, { fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8769/v1/chat/completions');
    assert.equal(options.redirect, 'error');
    const request = JSON.parse(options.body);
    assert.equal(request.stream, false);
    assert.equal(request.response_format.json_schema.strict, true);
    assert.match(request.messages[0].content, /untrusted/i);
    assert.match(request.messages[0].content, /indices/i);
    assert.doesNotMatch(request.messages[0].content, /emailStatus|"email"/);
    return response({ choices: [{ finish_reason: 'stop', message: { content: '{"indices":[2,0,3]}' } }] });
  } });
  assert.deepEqual(ranked, [contacts[2], contacts[0], contacts[3]]);
  assert.equal(ranked[0], contacts[2], 'do not reconstruct facts using model output');
});

test('ranking rejects fabricated people, invalid indices, duplicates and truncated generation', async () => {
  for (const content of ['{"indices":[9]}', '{"indices":[0,0]}', '{"indices":["1"]}', '{"indices":[0,1,2,3]}', '{"indices":[0],"name":"Made Up"}', 'not JSON']) {
    await assert.rejects(rankReferralContacts(context, contacts, { fetchImpl: async () => response({ choices: [{ finish_reason: 'stop', message: { content } }] }) }), /invalid|incomplete/i);
  }
  await assert.rejects(rankReferralContacts(context, contacts, { fetchImpl: async () => response({ choices: [{ finish_reason: 'length', message: { content: '{"indices":[0]}' } }] }) }), /incomplete/i);
});

test('empty candidates and expired budgets never make inference requests', async () => {
  assert.deepEqual(await rankReferralContacts(context, [], { fetchImpl: async () => assert.fail('no evidence') }), []);
  await assert.rejects(rankReferralContacts(context, contacts, { deadline: Date.now() - 1, fetchImpl: async () => assert.fail('expired') }), /budget|expired/i);
});
