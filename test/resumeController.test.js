import assert from 'node:assert/strict';
import test from 'node:test';
import Resume from '../src/models/Resume.js';
import User from '../src/models/User.js';
import TailoredResume from '../src/models/TailoredResume.js';
import { getResume, uploadResume } from '../src/controllers/resumeController.js';

const userId = '507f1f77bcf86cd799439011';
const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('replacing an original resume invalidates active tailoring revisions', async t => {
  t.mock.method(User, 'exists', async () => ({ _id: userId }));
  t.mock.method(Resume, 'findOneAndUpdate', async (_filter, update) => update.$set);
  const cancel = t.mock.method(TailoredResume, 'updateMany', async () => ({ modifiedCount: 1 }));
  const res = response();
  await uploadResume({ user: { _id: userId }, headers: { 'x-resume-filename': 'resume.pdf' }, body: Buffer.from('%PDF-1.7\nresume') }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(cancel.mock.callCount(), 1);
  assert.equal(cancel.mock.calls[0].arguments[0].user, userId);
  assert.equal(cancel.mock.calls[0].arguments[1].$inc.revision, 1);
});

test('resume storage errors cannot expose document contents in responses or logs', async t => {
  const secret = 'private-resume-content-example';
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  t.mock.method(Resume, 'findOne', () => ({ lean: async () => { throw new Error(secret); } }));
  const res = response();
  await getResume({ user: { _id: userId } }, res);
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(JSON.stringify([res.body, logs]), new RegExp(secret));
});

test('an upload finishing after account deletion removes its late resume record', async t => {
  let checks = 0;
  t.mock.method(User, 'exists', async () => ++checks === 1 ? { _id: userId } : null);
  t.mock.method(Resume, 'findOneAndUpdate', async (_filter, update) => update.$set);
  const cleanup = t.mock.method(Resume, 'deleteOne', async () => ({}));
  const res = response();
  await uploadResume({ user: { _id: userId }, headers: { 'x-resume-filename': 'resume.pdf' }, body: Buffer.from('%PDF-1.7\nresume') }, res);
  assert.equal(res.statusCode, 409);
  const [filter] = cleanup.mock.calls[0].arguments;
  assert.equal(filter.user, userId);
  assert.equal(filter._id, userId);
  assert.match(filter.sha256, /^[a-f0-9]{64}$/);
});
