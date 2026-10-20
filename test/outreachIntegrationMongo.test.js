import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import Application from '../src/models/Application.js';
import OutreachThread from '../src/models/OutreachThread.js';
import OutreachTask from '../src/models/OutreachTask.js';
import OutreachUsage from '../src/models/OutreachUsage.js';
import OutreachDiscoveryCache from '../src/models/OutreachDiscoveryCache.js';
import Campaign from '../src/models/Campaign.js';

test('HTTP outreach lifecycle isolates accounts, keeps applications distinct and cleans private data', { timeout: 90000 }, async t => {
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'outreach-integration-test-secret-at-least-32-characters';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  const mongo = new MongoMemoryServer({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  let server;
  t.after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); });
  await mongo.start();
  await mongoose.connect(mongo.getUri(), { dbName: 'outreach_http_integration' });
  await Promise.all([User.init(), OutreachTask.init(), OutreachThread.init(), Application.init(), OutreachUsage.init(), Campaign.init()]);
  const owner = await User.create({ email: 'owner@gmail.com' });
  const other = await User.create({ email: 'other@gmail.com' });
  const jobId = new mongoose.Types.ObjectId();
  await Job.collection.insertOne({ _id: jobId, title: 'Engineer', company: 'Example', companyDomain: 'example.com', fingerprint: 'outreach-http',
    status: 'active', isPublicIndia: true, description: 'Build accessible web interfaces.', sourceUrl: 'https://example.com/jobs/123' });
  const contact = { name: 'Alex Manager', title: 'Engineering Manager', kind: 'likely_contact', evidence: 'Alex Manager leads engineering at Example.',
    sourceUrl: 'https://example.com/team', email: 'alex@example.com', emailStatus: 'public' };
  const jobSnapshot = { title: 'Engineer', company: 'Example', companyDomain: 'example.com', jobUrl: 'https://example.com/jobs/123' };
  const task = await OutreachTask.create({ user: owner._id, job: jobId, kind: 'discovery', status: 'completed', result: { contacts: [contact], jobSnapshot } });
  await OutreachDiscoveryCache.create({ contextHash: 'public-evidence', contacts: [contact], jobSnapshot, expiresAt: new Date(Date.now() + 86400000) });
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const csrfResponse = await fetch(`${base}/api/auth/csrf-token`);
  const { token: csrf } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  async function request(path, { method = 'GET', user = owner, body } = {}) {
    const auth = `jobverify_token=${jwt.sign({ id: String(user._id), sessionVersion: 0 }, process.env.JWT_SECRET)}`;
    const response = await fetch(base + path, { method, headers: { Origin: process.env.CORS_ORIGIN, 'Content-Type': 'application/json',
      Cookie: `${auth}; ${csrfCookie}`, 'X-CSRF-Token': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  const profile = await request('/api/user/profile', { method: 'PUT', body: { aboutYou: 'I build interfaces.', experienceProjects: 'Built a planner.', portfolioUrl: 'https://example.com/work' } });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.aboutYou, 'I build interfaces.');
  const created = await request('/api/user/outreach/threads', { method: 'POST', body: { taskId: String(task._id), contactIndex: 0 } });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const threadId = created.body.data._id;
  const duplicate = await request('/api/user/outreach/threads', { method: 'POST', body: { taskId: String(task._id), contactIndex: 0 } });
  assert.equal(duplicate.body.data._id, threadId);
  assert.equal(await OutreachThread.countDocuments({ user: owner._id }), 1);
  assert.equal(await Application.countDocuments({ user: owner._id }), 0, 'Saving a contact does not record an Apply click');
  assert.equal((await request(`/api/user/outreach/tasks/${task._id}`, { user: other })).status, 404);
  assert.deepEqual((await request('/api/user/outreach/threads', { user: other })).body.data, []);
  assert.equal((await request(`/api/user/outreach/threads/${threadId}`, { method: 'PATCH', user: other, body: { status: 'sent' } })).status, 404);
  const edited = await request(`/api/user/outreach/threads/${threadId}`, { method: 'PATCH', body: {
    revision: created.body.data.revision, draft: { emailSubject: 'Engineer role', emailBody: 'Hello Alex, I build interfaces and would like to discuss the role.' }, emailConfirmed: true,
  } });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(edited.body.data.status, 'drafted');
  assert.equal((await request(`/api/user/outreach/threads/${threadId}`, { method: 'PATCH', body: { revision: 0, draft: { emailBody: 'Stale edit' } } })).status, 409);
  const campaign = await request('/api/user/campaigns', { method: 'POST', body: { threadIds: [threadId] } });
  assert.equal(campaign.status, 201, JSON.stringify(campaign.body));
  assert.equal(campaign.body.data.status, 'draft');
  assert.equal(campaign.body.data.items[0].status, 'draft');
  assert.equal((await request(`/api/user/campaigns/${campaign.body.data._id}`, { user: other })).status, 404);
  assert.equal((await request('/api/user/gmail')).body.data.connected, false);
  await Job.deleteOne({ _id: jobId });
  assert.equal((await request('/api/user/outreach/threads')).body.data[0].jobSnapshot.title, 'Engineer');
  const deleted = await request('/api/user/account', { method: 'DELETE' });
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
  assert.equal(await OutreachThread.countDocuments({ user: owner._id }), 0);
  assert.equal(await OutreachTask.countDocuments({ user: owner._id }), 0);
  assert.equal(await Campaign.countDocuments({ user: owner._id }), 0);
  assert.equal(await User.countDocuments({ _id: owner._id }), 0);
  assert.equal(await User.countDocuments({ _id: other._id }), 1);
  assert.equal(await OutreachDiscoveryCache.countDocuments({ contextHash: 'public-evidence' }), 1, 'Private cleanup retains shared public evidence');
});
