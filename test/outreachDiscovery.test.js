import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildJobContext, groundedContacts, hunterEmail, searchTavily } from '../src/services/outreachProviders.js';
import OutreachThread from '../src/models/OutreachThread.js';
import OutreachUsage from '../src/models/OutreachUsage.js';
import { reserveUsage } from '../src/services/outreachUsage.js';

const job = { title: 'Frontend Engineer', company: 'Example Corp', department: 'Engineering', companyDomain: 'example.com', location: 'Pune', description: 'Build React applications.' };
test('job context hash changes with stored context and never treats an ATS as employer', () => {
  const first = buildJobContext(job);
  assert.equal(first.companyDomain, 'example.com');
  assert.notEqual(first.contextHash, buildJobContext({ ...job, description: 'Changed' }).contextHash);
  assert.equal(buildJobContext({ ...job, companyDomain: 'jobs.lever.co', applyUrl: 'https://jobs.lever.co/example/1' }).companyDomain, '');
  assert.equal(buildJobContext({ ...job, companyDomain: null, companyCareerPage: 'https://careers.example.com/jobs' }).companyDomain, 'example.com');
  assert.equal(buildJobContext({ ...job, companyDomain: 'gmail.com' }).companyDomain, '');
});

test('contacts need a named source, employer evidence, role evidence and are ranked and deduplicated', () => {
  const results = [
    { title: 'Jobs at Example Corp', url: 'https://example.com/jobs', content: 'We are hiring Frontend Engineers.' },
    { title: 'John Smith - Recruiter at Example Corp | LinkedIn', url: 'https://www.linkedin.com/in/john-smith', content: 'John Smith is a recruiter at Example Corp.' },
    { title: 'Jane Doe - Engineering Manager at Example Corp | LinkedIn', url: 'https://www.linkedin.com/in/jane-doe', content: 'Jane Doe leads Engineering at Example Corp.' },
    { title: 'Alex Brown on LinkedIn: We are hiring Frontend Engineers at Example Corp', url: 'https://www.linkedin.com/posts/alex-brown_hiring-activity-123', content: 'Alex Brown: My team at Example Corp is hiring a Frontend Engineer in Pune.' },
    { title: 'Stranger Person - Engineering Manager at Other Corp', url: 'https://www.linkedin.com/in/stranger', content: 'Other Corp is hiring.' },
    { title: 'Unrelated Person - Engineering Manager at Other Corp | LinkedIn', url: 'https://www.linkedin.com/in/unrelated', content: 'An Engineering Manager at Other Corp discussed an Example Corp Frontend Engineer vacancy.' },
    { title: 'Alex Brown on LinkedIn: hiring at Example Corp', url: 'https://www.linkedin.com/posts/alex-brown_hiring-activity-123', content: 'My team at Example Corp is hiring a Frontend Engineer.' },
  ];
  const contacts = groundedContacts(results, buildJobContext(job));
  assert.equal(contacts.length, 3);
  assert.deepEqual(contacts.map(c => c.name), ['Alex Brown', 'Jane Doe', 'John Smith']);
  assert.equal(contacts[0].kind, 'hiring_post_author');
  assert.equal(contacts[1].kind, 'likely_contact');
  assert.ok(contacts.every(c => c.sourceUrl && c.evidence && c.emailStatus === 'unavailable'));
});

test('short and punctuated company names require an actual matching employer phrase', () => {
  const fixtures = [
    { company: 'EY', name: 'Ashley Smith' },
    { company: 'X', name: 'Alex Brown' },
    { company: 'C', name: 'Cameron Lee' },
    { company: 'C++', name: 'Jamie Smith' },
    { company: 'C#', name: 'Jamie Smith' },
    { company: 'AT&T', name: 'Jamie Smith' },
    { company: 'Example (India) Pvt. Ltd.', name: 'Jamie Smith' },
    { company: 'Example Corp', name: 'Jamie Smith' },
  ];
  for (const { company, name } of fixtures) {
    const context = buildJobContext({ ...job, company });
    const source = (employer, content = `${name} is an Engineering Manager at ${employer}.`) => ({ title: `${name} - Engineering Manager at ${employer} | LinkedIn`, url: 'https://www.linkedin.com/in/fixture-manager', content });
    assert.equal(groundedContacts([source(company)], context).length, 1, `matching employer ${company}`);
    assert.equal(groundedContacts([source('Other Corp')], context).length, 0, `name substring is not employer ${company}`);
    assert.equal(groundedContacts([source('Other Corp', `${name} is an Engineering Manager at Other Corp and discussed ${company} jobs.`)], context).length, 0, `unrelated mention is not employment ${company}`);
    assert.equal(groundedContacts([source('Other Corp', `${name} is an Engineering Manager at Other Corp. ${name} discusses engineering jobs at ${company}.`)], context).length, 0, `job mention is not employment ${company}`);
    assert.equal(groundedContacts([source(`${company} Partners`)], context).length, 0, `employer suffix remains significant ${company}`);
    assert.equal(groundedContacts([source(`Other ${company}`)], context).length, 0, `employer prefix remains significant ${company}`);
  }
});

test('an employer in a named employment sentence or separate title field is grounded exactly', () => {
  const context = buildJobContext({ ...job, company: 'EY' });
  const source = { title: 'Ashley Smith - Engineering Manager | LinkedIn', url: 'https://www.linkedin.com/in/ashley-smith', content: 'Ashley Smith is an Engineering Manager at EY. She writes about frontend engineering.' };
  assert.equal(groundedContacts([source], context).length, 1);
  assert.equal(groundedContacts([{ ...source, title: 'Ashley Smith - Engineering Manager - EY | LinkedIn' }], context).length, 1);
  assert.equal(groundedContacts([{ ...source, content: 'Ashley Smith is an Engineering Manager at EY Partners.' }], context).length, 0);
});

test('hiring-post author employer evidence also excludes names and unrelated company mentions', () => {
  const context = buildJobContext({ ...job, company: 'EY' });
  const source = { title: 'Ashley Smith on LinkedIn: We are hiring Frontend Engineers at Other Corp', url: 'https://www.linkedin.com/posts/ashley-smith_hiring-activity-123', content: 'My team at Other Corp is hiring a Frontend Engineer. EY has a different engineering vacancy.' };
  assert.equal(groundedContacts([source], context).length, 0);
  assert.equal(groundedContacts([{ ...source, title: 'Ashley Smith on LinkedIn: We are hiring Frontend Engineers at EY', content: 'My team at EY is hiring a Frontend Engineer.' }], context)[0]?.kind, 'hiring_post_author');
});

test('referral discovery includes relevant employees and ranks them before recruiters', () => {
  const results = [
    { title: 'John Smith - Recruiter at Example Corp | LinkedIn', url: 'https://www.linkedin.com/in/john-smith', content: 'John Smith is a recruiter at Example Corp.' },
    { title: 'Jamie Patel - Frontend Engineer at Example Corp | LinkedIn', url: 'https://www.linkedin.com/in/jamie-patel', content: 'Jamie Patel builds accessible frontend applications at Example Corp.' },
    { title: 'Taylor Brown - Frontend Engineer at Other Corp | LinkedIn', url: 'https://www.linkedin.com/in/taylor-brown', content: 'Taylor Brown discusses Example Corp vacancies.' },
    { title: 'Morgan Lee - Accountant at Example Corp | LinkedIn', url: 'https://www.linkedin.com/in/morgan-lee', content: 'Morgan Lee works in corporate accounting at Example Corp.' },
  ];
  const contacts = groundedContacts(results, buildJobContext(job));
  assert.deepEqual(contacts.map(contact => contact.name), ['Jamie Patel', 'John Smith']);
  assert.equal(contacts[0].kind, 'likely_contact', 'employment evidence does not establish willingness to refer');
});

test('an evidenced referral-post author ranks first and its kind survives thread validation', () => {
  const results = [
    { title: 'Alex Brown on LinkedIn: We are hiring Frontend Engineers at Example Corp', url: 'https://www.linkedin.com/posts/alex-brown_hiring-activity-123', content: 'My team at Example Corp is hiring a Frontend Engineer.' },
    { title: 'Jamie Patel - Frontend Engineer at Example Corp | LinkedIn', url: 'https://www.linkedin.com/in/jamie-patel', content: 'Jamie Patel works at Example Corp.' },
    { title: 'Sam Wilson on LinkedIn: Frontend Engineer referrals at Example Corp', url: 'https://www.linkedin.com/posts/sam-wilson_referral-activity-123', content: 'Sam Wilson is a Frontend Engineer at Example Corp. I can refer you for this frontend role.' },
  ];
  const contacts = groundedContacts(results, buildJobContext(job));
  assert.deepEqual(contacts.map(contact => contact.name), ['Sam Wilson', 'Alex Brown', 'Jamie Patel']);
  assert.equal(contacts[0].kind, 'referral_post_author');
  const thread = new OutreachThread({ user: '507f1f77bcf86cd799439011', job: '507f1f77bcf86cd799439012', contactKey: 'sam-wilson', jobSnapshot: { title: job.title, company: job.company }, contact: contacts[0] });
  assert.equal(thread.validateSync(), undefined);
});

test('referral mentions and declined referrals never become an offer to refer', () => {
  const context = buildJobContext(job);
  for (const evidence of ['I cannot refer candidates for this frontend role.', 'I am not happy to refer applicants.', 'Please do not message me for referrals.', 'We received a referral for a Frontend Engineer.', 'I can refer frontend candidates at Other Corp.']) {
    const contacts = groundedContacts([{ title: 'Sam Wilson on LinkedIn: Frontend Engineer at Example Corp', url: 'https://www.linkedin.com/posts/sam-wilson_frontend-activity-123', content: evidence }], context);
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].kind, 'likely_contact', evidence);
  }
});

test('former employees are not treated as current referral contacts', () => {
  const context = buildJobContext(job);
  for (const role of ['Former Frontend Engineer', 'Ex-Frontend Engineer', 'Previously Frontend Engineer']) {
    assert.deepEqual(groundedContacts([{ title: `Jamie Patel - ${role} at Example Corp | LinkedIn`, url: 'https://www.linkedin.com/in/jamie-patel', content: 'Jamie Patel previously worked on frontend applications at Example Corp.' }], context), []);
    assert.deepEqual(groundedContacts([{ title: `Jamie Patel on LinkedIn: ${role} at Example Corp`, url: 'https://www.linkedin.com/posts/jamie-patel_frontend-123', content: 'My team at Example Corp is hiring a Frontend Engineer.' }], context), []);
  }
});

test('referral discovery does not reuse results cached under the previous hiring-only policy', () => {
  const { contextHash, ...context } = buildJobContext(job);
  const oldHash = createHash('sha256').update(JSON.stringify(context)).digest('hex');
  assert.notEqual(contextHash, oldHash);
});

test('search explicitly uses one-credit basic search and never requests an AI answer', async () => {
  const result = await searchTavily(buildJobContext(job), { apiKey: 'fixture', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.tavily.com/search');
    const body = JSON.parse(options.body);
    assert.equal(body.search_depth, 'basic');
    assert.equal(body.auto_parameters, false);
    assert.equal(body.include_answer, false);
    assert.match(body.query, /Example Corp/);
    assert.match(body.query, /referral/i);
    assert.match(body.query, /employee/i);
    assert.equal(body.max_results, 12);
    return { ok: true, json: async () => ({ results: [] }) };
  } });
  assert.deepEqual(result, []);
});

test('Hunter email confidence never substitutes for provider verification, and domains must match', () => {
  assert.equal(hunterEmail({ email: 'jane@example.com', score: 100, verification: { status: 'unknown' } }, 'example.com').emailStatus, 'unverified');
  assert.equal(hunterEmail({ email: 'jane@example.com', verification: { status: 'valid' } }, 'example.com').emailStatus, 'verified');
  assert.equal(hunterEmail({ email: 'jane@example.com', sources: [{ uri: 'https://example.com/team' }] }, 'example.com').emailStatus, 'public');
  assert.equal(hunterEmail({ email: 'jane@other.com', verification: { status: 'valid' } }, 'example.com').emailStatus, 'unavailable');
  assert.equal(hunterEmail({ email: 'jane@example.com', verification: { status: 'invalid' } }, 'example.com').emailStatus, 'unavailable');
});

test('quota reserves use atomic persisted conditional increments and deny exhausted budgets', async t => {
  t.mock.method(OutreachUsage, 'updateOne', async () => ({}));
  t.mock.method(OutreachUsage, 'findOneAndUpdate', async (filter, update) => {
    assert.deepEqual(filter, { key: 'provider:tavily:2026-10', used: { $lte: 999 } });
    assert.deepEqual(update.$inc, { used: 1 });
    return null;
  });
  await assert.rejects(reserveUsage('provider:tavily:2026-10', 1000), error => error.statusCode === 429);
});
