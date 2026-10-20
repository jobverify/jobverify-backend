import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Application from '../src/models/Application.js';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';
import TailoredResume from '../src/models/TailoredResume.js';
import { recordApplicationOpen } from '../src/services/applicationService.js';

test('MongoDB and HTTP application lifecycle preserves manual status, privacy and history', { timeout: 90000 }, async t => {
  const mongo = new MongoMemoryServer({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'application-lifecycle-test-secret-only-12345';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  await mongo.start();
  await mongoose.connect(mongo.getUri(), { dbName: 'application_lifecycle_test' });
  await Application.init();
  const user = new mongoose.Types.ObjectId();
  const otherUser = new mongoose.Types.ObjectId();
  await User.collection.insertMany([
    { _id: user, email: 'application@example.test', role: 'user', sessionVersion: 0 },
    { _id: otherUser, email: 'other@example.test', role: 'user', sessionVersion: 0 },
  ]);
  const jobId = new mongoose.Types.ObjectId();
  const job = { _id: jobId, title: 'Software Engineer', company: 'Example Corp', location: 'Pune', jobType: 'Full-time Fresher',
    sourceUrl: 'https://example.test/jobs/123', sourceDescription: 'Build applications and collaborate with engineers.', description: 'Build applications and collaborate with engineers.',
    status: 'active', isPublicIndia: true, clickCount: 0, fingerprint: 'application-test-job' };
  await Job.collection.insertOne(job);
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const csrfResponse = await fetch(`${base}/api/auth/csrf-token`, { headers: { Origin: process.env.CORS_ORIGIN } });
  const { token: csrf } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  async function request(path, { method = 'GET', owner = user, includeCsrf = true } = {}) {
    const auth = owner ? `jobverify_token=${jwt.sign({ id: owner.toString(), sessionVersion: 0 }, process.env.JWT_SECRET)}` : '';
    const response = await fetch(`${base}${path}`, { method, headers: {
      Origin: process.env.CORS_ORIGIN, 'Content-Type': 'application/json',
      Cookie: `${auth}; ${csrfCookie}`, ...(includeCsrf ? { 'X-CSRF-Token': csrf } : {}),
    } });
    return { status: response.status, body: await response.json() };
  }

  assert.equal((await request('/api/user/applications', { owner: null })).status, 401);
  const untracked = await request(`/api/jobs/${jobId}/click`, { method: 'POST' });
  assert.equal(untracked.status, 200);
  assert.equal(untracked.body.data.application, null, 'Apply alone must not add a job');
  assert.equal(await Application.countDocuments({ user }), 0);
  await TailoredResume.collection.insertOne({ _id: `${otherUser}:${jobId}`, user: otherUser, job: jobId, status: 'completed', output: { summary: 'Other user resume' } });
  assert.equal(await recordApplicationOpen(user, job), null, 'another user resume does not qualify');
  await TailoredResume.collection.insertOne({ _id: `${user}:${jobId}`, user, job: jobId, status: 'queued', output: null });
  assert.equal(await recordApplicationOpen(user, job), null, 'pending generation does not qualify');
  await TailoredResume.updateOne({ user, job: jobId }, { $set: { status: 'failed' } });
  assert.equal(await recordApplicationOpen(user, job), null, 'failed generation does not qualify');
  await TailoredResume.updateOne({ user, job: jobId }, { $set: { status: 'completed', output: { summary: 'My tailored resume' } } });
  const first = await request(`/api/jobs/${jobId}/click`, { method: 'POST' });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.data.application.status, 'opened');
  const id = first.body.data.application._id;
  await Promise.all(Array.from({ length: 5 }, () => recordApplicationOpen(user, job)));
  assert.equal(await Application.countDocuments({ user, job: jobId }), 1);
  // Each user gets a distinct record for the same job, including racing first opens.
  await Promise.all(Array.from({ length: 5 }, () => recordApplicationOpen(otherUser, job)));
  assert.equal(await Application.countDocuments({ user: otherUser, job: jobId }), 1);
  assert.equal((await request(`/api/user/applications/${id}/applied`, { method: 'PUT', owner: otherUser })).status, 404);
  assert.equal((await request(`/api/user/applications/${id}/applied`, { method: 'PUT', includeCsrf: false })).status, 403);
  const confirmed = await request(`/api/user/applications/${id}/applied`, { method: 'PUT' });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.status, 'applied');
  assert.ok(confirmed.body.data.appliedAt);
  const again = await request(`/api/jobs/${jobId}/click`, { method: 'POST' });
  assert.equal(again.body.data.application.status, 'applied');
  assert.equal(again.body.data.application.appliedAt, confirmed.body.data.appliedAt);
  assert.equal((await Job.findById(jobId)).clickCount, 1, 'duplicate tracking keeps analytics deduplication');
  const repeated = await request(`/api/user/applications/${id}/applied`, { method: 'PUT' });
  assert.equal(repeated.body.data.appliedAt, confirmed.body.data.appliedAt);
  await Job.deleteOne({ _id: jobId });
  const history = await request('/api/user/applications?status=applied&page=1');
  assert.equal(history.body.data.length, 1);
  assert.equal(history.body.data[0].jobSnapshot.title, job.title);
  assert.deepEqual(history.body.summary, { total: 1, opened: 0, applied: 1 });
  const legacyJob = new mongoose.Types.ObjectId();
  await Application.create({ user, job: legacyJob, status: 'applied', jobSnapshot: job });
  for (const status of ['all', 'opened', 'applied']) {
    const filtered = await request(`/api/user/applications?status=${status}&page=1`);
    assert.deepEqual(filtered.body.summary, { total: 1, opened: 0, applied: 1 });
    assert.equal(filtered.body.pagination.total, status === 'opened' ? 0 : 1);
    assert.equal(filtered.body.data.length, status === 'opened' ? 0 : 1);
    assert.ok(filtered.body.data.every(item => item.job === String(jobId)));
  }
});
