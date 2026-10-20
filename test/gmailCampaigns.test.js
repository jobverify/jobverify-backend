import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptRefreshToken, decryptRefreshToken, buildRawMessage, classifyGmailFailure } from '../src/services/gmailService.js';
import { addWeekdays, threadSnapshotHash } from '../src/services/campaignService.js';

const key = Buffer.alloc(32, 7).toString('base64');

test('Gmail refresh tokens use authenticated encryption and require configuration', () => {
  const first = encryptRefreshToken('private-refresh-token', key);
  const second = encryptRefreshToken('private-refresh-token', key);
  assert.notEqual(first, second);
  assert.ok(!first.includes('private-refresh-token'));
  assert.equal(decryptRefreshToken(first, key), 'private-refresh-token');
  const parts = first.split('.');
  parts[2] = Buffer.alloc(16).toString('base64url');
  assert.throws(() => decryptRefreshToken(parts.join('.'), key));
  assert.throws(() => encryptRefreshToken('secret', ''), /configuration/i);
  assert.throws(() => encryptRefreshToken('secret', 'bad-key'), /configuration/i);
});

test('Gmail MIME encoding preserves Unicode while refusing injected headers', () => {
  const raw = buildRawMessage({ from: 'candidate@example.test', to: 'manager@example.test', subject: 'Hello — café', body: 'Hello\nMy résumé is attached as a link.' });
  const mime = Buffer.from(raw, 'base64url').toString('utf8');
  assert.match(mime, /To: manager@example.test\r\n/);
  assert.match(mime, /Content-Transfer-Encoding: base64/);
  assert.ok(mime.includes(Buffer.from('Hello — café').toString('base64')));
  assert.throws(() => buildRawMessage({ from: 'candidate@example.test', to: 'a@example.test\r\nBcc: x@example.test', subject: 'Hi', body: 'Hello' }), /address/i);
  assert.throws(() => buildRawMessage({ from: 'candidate@example.test', to: 'a@example.test', subject: 'Hi\nBcc: x@example.test', body: 'Hello' }), /subject/i);
});

test('uncertain Gmail outcomes are distinguished from explicit provider rejections', () => {
  assert.equal(classifyGmailFailure({ status: 400 }).ambiguous, false);
  assert.equal(classifyGmailFailure({ status: 429 }).ambiguous, false);
  assert.equal(classifyGmailFailure({ status: 503 }).ambiguous, true);
  assert.equal(classifyGmailFailure(new Error('request timed out')).ambiguous, true);
});

test('four weekday reminders cross weekends and preserve send time', () => {
  assert.equal(addWeekdays(new Date('2026-10-16T10:11:12.000Z'), 4).toISOString(), '2026-10-22T10:11:12.000Z');
  assert.equal(addWeekdays(new Date('2026-10-19T10:11:12.000Z'), 4).toISOString(), '2026-10-23T10:11:12.000Z');
  assert.equal(addWeekdays(new Date('2026-10-18T19:00:00.000Z'), 4).toISOString(), '2026-10-22T19:00:00.000Z', 'Monday IST schedules Friday IST');
  assert.equal(addWeekdays(new Date('2026-10-16T19:00:00.000Z'), 4).toISOString(), '2026-10-21T19:00:00.000Z', 'Saturday IST schedules Thursday IST');
});

test('campaign approval snapshot includes contact, draft and job context', () => {
  const thread = { revision: 2, contact: { email: 'a@example.test', emailConfirmed: false }, draft: { emailBody: 'One' }, jobSnapshot: { company: 'Example' } };
  assert.equal(threadSnapshotHash(thread), threadSnapshotHash(structuredClone(thread)));
  assert.notEqual(threadSnapshotHash(thread), threadSnapshotHash({ ...thread, draft: { emailBody: 'Two' } }));
  assert.notEqual(threadSnapshotHash(thread), threadSnapshotHash({ ...thread, contact: { ...thread.contact, emailConfirmed: true } }));
});
