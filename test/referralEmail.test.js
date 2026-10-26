import assert from 'node:assert/strict';
import test from 'node:test';
import * as referral from '../outreach/referralSearch.js';

const contact = { name: 'Jane Doe', title: 'Frontend Engineer at Example Corp', sourceUrl: 'https://www.linkedin.com/in/jane-doe', linkedinUrl: 'https://www.linkedin.com/in/jane-doe' };
const context = { company: 'Example Corp', companyDomain: 'example.com', title: 'Frontend Engineer', department: 'Engineering' };
const source = (content = 'Jane Doe is a Frontend Engineer at Example Corp. Contact Jane at jane@example.com.') => ({
  title: 'Jane Doe - Frontend Engineer at Example Corp', url: 'https://example.com/team/jane', content,
});
const response = data => ({ ok: true, json: async () => data });
const model = content => response({ choices: [{ finish_reason: 'stop', message: { content } }] });
const unavailable = { email: '', emailStatus: 'unavailable' };
const findEmail = (...args) => { assert.equal(typeof referral.findPublicReferralEmail, 'function'); return referral.findPublicReferralEmail(...args); };

test('email selection copies a literal address and its evidence, never model-generated facts', async () => {
  const evidence = source();
  const result = await findEmail(contact, 'example.com', { context, results: [evidence], fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8769/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.match(body.messages[0].content, /untrusted/i);
    assert.match(body.messages[0].content, /jane@example.com/);
    return model('{"index":0}');
  } });
  assert.deepEqual(result, { email: 'jane@example.com', emailStatus: 'public', emailConfirmed: false, emailSourceUrl: evidence.url, emailEvidence: evidence.content });
});

test('missing evidence triggers one bounded contact-specific public search', async () => {
  const urls = [];
  const result = await findEmail(contact, 'example.com', { context, results: [], fetchImpl: async (url, options) => {
    urls.push(url);
    if (url.endsWith('/search')) {
      const params = new URLSearchParams(options.body);
      assert.match(params.get('q'), /"Jane Doe"/);
      assert.match(params.get('q'), /"example.com"/);
      assert.equal(params.get('format'), 'json');
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal);
      return response({ results: [source()] });
    }
    return model('{"index":0}');
  } });
  assert.equal(result.email, 'jane@example.com');
  assert.equal(urls.length, 2);
});

test('unrelated names, employers, domains, unsafe sources and ambiguous pages yield no email', async () => {
  const badSources = [
    { ...source(), title: 'John Smith - Frontend Engineer at Example Corp' },
    { ...source(), title: 'Jane Doe - Frontend Engineer at Other Corp' },
    source('Jane Doe is a Frontend Engineer at Example Corp. jane@other.com'),
    source('Jane Doe is a Frontend Engineer at Example Corp. jane@example.com.evil.test'),
    source('Jane Doe is a Frontend Engineer at Example Corp. jane@example.com and john@example.com'),
    { ...source(), url: 'http://127.0.0.1/team/jane' },
    { ...source(), url: 'https://directory.test/jane' },
    source('Jane Doe is a Frontend Engineer at Example Corp. Guess jane at example dot com.'),
  ];
  for (const evidence of badSources) {
    let searches = 0;
    assert.deepEqual(await findEmail(contact, 'example.com', { context, results: [evidence], fetchImpl: async url => {
      assert.equal(url, 'http://127.0.0.1:8780/search', 'unsupported evidence must never reach inference');
      searches++;
      return response({ results: [evidence] });
    } }), unavailable);
    assert.equal(searches, 1);
  }
});

test('model abstention, fabricated fields, invalid indices and truncated output preserve fallback', async () => {
  for (const content of ['{"index":-1}', '{"index":1}', '{"index":"0"}', '{"index":0,"email":"guessed@example.com"}', 'not JSON', '{}']) {
    assert.deepEqual(await findEmail(contact, 'example.com', { context, results: [source()], fetchImpl: async () => model(content) }), unavailable);
  }
  assert.deepEqual(await findEmail(contact, 'example.com', { context, results: [source()], fetchImpl: async () => response({ choices: [{ finish_reason: 'length', message: { content: '{"index":0}' } }] }) }), unavailable);
});

test('expired budgets and missing domain/context skip I/O; network and inference errors are optional', async () => {
  for (const options of [{ context, deadline: Date.now() - 1 }, { context: {} }, { context, remainingMs: 0 }]) {
    assert.deepEqual(await findEmail(contact, 'example.com', { ...options, fetchImpl: async () => assert.fail('no budget or employer') }), unavailable);
  }
  assert.deepEqual(await findEmail(contact, '', { context, fetchImpl: async () => assert.fail('no domain') }), unavailable);
  for (const results of [[], [source()]]) {
    assert.deepEqual(await findEmail(contact, 'example.com', { context, results, fetchImpl: async () => { throw new Error('private provider details'); } }), unavailable);
  }
});

test('large evidence pools keep the prompt bounded and never infer after the deadline', async t => {
  const large = source(`Jane Doe is a Frontend Engineer at Example Corp. ${'Public biography. '.repeat(100)} jane@example.com`);
  let prompt;
  const enriched = await findEmail(contact, 'example.com', { context, results: Array.from({ length: 12 }, (_, n) => ({ ...large, url: `${large.url}/${n}?q=${'a'.repeat(7000)}` })), fetchImpl: async (_url, options) => {
    prompt = JSON.parse(options.body).messages[0].content;
    return model('{"index":0}');
  } });
  assert.equal(enriched.email, 'jane@example.com');
  assert.ok(prompt.length < 6000, 'fit the local model context without long source URLs');
  assert.match(prompt, /jane@example.com/);
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  let calls = 0;
  const value = await findEmail(contact, 'example.com', { context, deadline: Date.now() + 2000, fetchImpl: async () => {
    calls++;
    t.mock.timers.tick(2001);
    return response({ results: [source()] });
  } });
  assert.equal(calls, 1);
  assert.deepEqual(value, unavailable);
});
