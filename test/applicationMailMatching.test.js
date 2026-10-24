import assert from 'node:assert/strict';
import test from 'node:test';

const module = await import('../src/services/applicationMailMatching.js').catch(() => ({}));
const message = { subject: 'We received your application', text: 'Thank you for applying to Example Corp for the Backend Engineer position.', links: [], receivedAt: new Date('2026-10-24T09:00:00Z') };
const applications = [
  { _id: 'backend', jobSnapshot: { company: 'Example Corp', title: 'Backend Engineer', applicationUrl: 'https://jobs.lever.co/example/12345678-1234-1234-1234-123456789abc/apply' } },
  { _id: 'frontend', jobSnapshot: { company: 'Example Corp', title: 'Frontend Engineer', applicationUrl: 'https://jobs.lever.co/example/12345678-1234-1234-1234-123456789def/apply' } },
];

test('acknowledgements identify the role, not merely its employer', () => {
  assert.equal(typeof module.matchAcknowledgement, 'function', 'Gmail acknowledgement matching must be implemented');
  assert.equal(module.matchAcknowledgement(message, applications).applicationId, 'backend');
  assert.equal(module.matchAcknowledgement({ ...message, text: 'Thank you for applying to Example Corp.' }, applications).applicationId, null);
});

test('incomplete, rejected and quoted acknowledgements cannot confirm submission', () => {
  assert.equal(typeof module.isAcknowledgement, 'function');
  for (const text of [
    'Thank you for applying. Please complete your application before we can review it.',
    'Your application was not submitted. Please try again.',
    'Unfortunately we will not be moving forward. Thank you for applying.',
    'Finish your application today.',
    'New jobs for you.\n> Thank you for applying to Example Corp.',
  ]) assert.equal(module.isAcknowledgement({ subject: '', text }), false, text);
  assert.equal(module.isAcknowledgement(message), true);
});

test('an exact job link can disambiguate identical titles but a tracking URL cannot', () => {
  assert.equal(typeof module.matchAcknowledgement, 'function');
  const duplicate = [applications[0], { ...applications[1], jobSnapshot: { ...applications[1].jobSnapshot, title: 'Backend Engineer' } }];
  assert.equal(module.matchAcknowledgement(message, duplicate).applicationId, null);
  assert.equal(module.matchAcknowledgement({ ...message, links: [applications[0].jobSnapshot.applicationUrl + '?source=email'] }, duplicate).applicationId, 'backend');
  assert.equal(module.matchAcknowledgement({ ...message, links: ['https://tracking.example/?url=' + encodeURIComponent(applications[0].jobSnapshot.applicationUrl)] }, duplicate).applicationId, null);
});

test('query-string posting identifiers remain distinct', () => {
  const jobs = [{ ...applications[0], jobSnapshot: { ...applications[0].jobSnapshot, applicationUrl: 'https://company.example/jobdetails?id=123' } }];
  const received = { ...message, text: 'Thank you for applying for Sales Manager.', links: ['https://company.example/jobdetails?id=999'] };
  assert.equal(module.matchAcknowledgement(received, jobs).applicationId, null);
});
