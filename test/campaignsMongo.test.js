import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Campaign from '../src/models/Campaign.js';
import GmailConnection from '../src/models/GmailConnection.js';
import GmailOAuthState from '../src/models/GmailOAuthState.js';
import OutreachThread from '../src/models/OutreachThread.js';
import User from '../src/models/User.js';
import { approveCampaign as approveCampaignService, cancelCampaign, cleanupUserCampaignData, createCampaign, getCampaign, processCampaignQueue, updateCampaign as updateCampaignService } from '../src/services/campaignService.js';
import { completeGmailAuthorization, createGmailAuthorization, disconnectGmail, encryptRefreshToken, getGmailStatus, sendGmailMessage } from '../src/services/gmailService.js';

test('MongoDB Gmail authorization and campaign queue lifecycle', { timeout: 90000 }, async t => {
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
  process.env.GMAIL_CLIENT_ID = 'gmail-test-client';
  process.env.GMAIL_REDIRECT_URI = 'http://localhost/api/user/gmail/callback';
  const mongo = new MongoMemoryServer({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongo.start();
  await mongoose.connect(mongo.getUri(), { dbName: 'campaign_lifecycle' });
  await Promise.all([Campaign.init(), GmailConnection.init(), GmailOAuthState.init(), OutreachThread.init()]);
  const now = new Date('2026-10-19T08:00:00Z');
  let number = 0;
  async function reset() { await Promise.all([Campaign.deleteMany({}), GmailConnection.deleteMany({}), GmailOAuthState.deleteMany({}), OutreachThread.deleteMany({}), User.deleteMany({})]); }
  async function user() { return User.create({ email: `candidate${++number}@example.test` }); }
  async function connect(owner) { return GmailConnection.create({ user: owner._id, email: owner.email, encryptedRefreshToken: encryptRefreshToken('refresh-token'), connectionVersion: `version-${owner._id}` }); }
  async function thread(owner, extra = {}) {
    const suffix = ++number;
    return OutreachThread.create({ user: owner._id, job: new mongoose.Types.ObjectId(), contactKey: `contact-${suffix}`,
      jobSnapshot: { company: 'Example', title: 'Engineer' }, contact: { name: 'Hiring Manager', email: `manager${suffix}@example.test`,
        emailStatus: 'verified', sourceUrl: 'https://example.test/team', evidence: 'Engineering manager', kind: 'likely_contact' },
      draft: { emailSubject: 'Engineering role', emailBody: 'Hello, I would like to discuss the role.' }, status: 'drafted', ...extra });
  }
  const send = async () => ({ id: 'provider-message' });
  async function approveCampaign(owner, id, options = {}) { return approveCampaignService(owner, id, { revision: (await Campaign.findById(id)).revision, ...options }); }
  async function updateCampaign(owner, id, changes) { return updateCampaignService(owner, id, { revision: (await Campaign.findById(id)).revision, ...changes }); }

  await t.test('reviewed campaign revisions prevent unseen edits from another tab being approved', async () => {
    await reset(); const owner = await user(); await connect(owner); const draft = await thread(owner);
    const campaign = await createCampaign(owner._id, [draft._id]);
    await assert.rejects(updateCampaignService(owner._id, campaign._id, { items: [] }), /revision/i);
    const changed = await updateCampaignService(owner._id, campaign._id, { revision: 0, items: [{ _id: campaign.items[0]._id, body: 'Changed in tab B' }] });
    await assert.rejects(approveCampaignService(owner._id, campaign._id, { now }), /revision/i);
    await assert.rejects(approveCampaignService(owner._id, campaign._id, { revision: 0, now }), /changed|revision/i);
    const approved = await approveCampaignService(owner._id, campaign._id, { revision: changed.revision, now });
    assert.equal((await approveCampaignService(owner._id, campaign._id, { revision: changed.revision, now })).status, approved.status);
    await assert.rejects(approveCampaignService(owner._id, campaign._id, { revision: 0, now }), /changed|revision/i);
  });

  await t.test('a deleted contact is never handed to the sending provider', async () => {
    await reset(); const owner = await user(); await connect(owner); const draft = await thread(owner);
    const campaign = await createCampaign(owner._id, [draft._id]); await approveCampaign(owner._id, campaign._id, { now });
    await OutreachThread.deleteOne({ _id: draft._id }); let calls = 0;
    await processCampaignQueue({ now, send: async () => { calls++; return { id: 'should-not-send' }; } });
    assert.equal(calls, 0); assert.equal((await Campaign.findById(campaign._id)).items[0].status, 'cancelled');
  });

  await t.test('one normalized Gmail sender can be active on only one Jobverify account', async () => {
    await reset(); const owner = await user(); const other = await user(); await connect(owner);
    await assert.rejects(GmailConnection.create({ user: other._id, email: owner.email.toUpperCase(), encryptedRefreshToken: encryptRefreshToken('token'), connectionVersion: 'other' }), error => error.code === 11000);
  });

  await t.test('conflicting verified OAuth identity reports 409; reconnect preserves durable sending limits', async () => {
    await reset(); const owner = await user(); const other = await user(); await connect(owner);
    await GmailConnection.updateOne({ user: owner._id }, { $set: { sendReservations: [now], nextSendAt: new Date(now.getTime() + 180000) } });
    let options;
    const client = { generateAuthUrl(value) { options = value; return 'https://accounts.google.com/mock'; },
      async getToken() { return { tokens: { scope: 'openid email https://www.googleapis.com/auth/gmail.send', id_token: 'identity', refresh_token: 'private-token' } }; },
      async verifyIdToken() { return { getPayload: () => ({ email: owner.email.toUpperCase(), email_verified: true }) }; } };
    await createGmailAuthorization(other, 'other-session', { client, now });
    await assert.rejects(completeGmailAuthorization(other, 'other-session', { state: options.state, code: 'code' }, { client, now }), error => error.statusCode === 409 && /another Jobverify/.test(error.message));
    await createGmailAuthorization(owner, 'owner-session', { client, now });
    await completeGmailAuthorization(owner, 'owner-session', { state: options.state, code: 'code' }, { client, now });
    const connection = await GmailConnection.findOne({ user: owner._id });
    assert.equal(connection.nextSendAt.getTime(), now.getTime() + 180000); assert.deepEqual(connection.sendReservations.map(value => value.getTime()), [now.getTime()]);
  });

  await t.test('a blocked OAuth replacement invalidates campaigns reviewed with the original sender', async () => {
    await reset(); const owner = await user(); await connect(owner); const draft = await thread(owner);
    const campaign = await createCampaign(owner._id, [draft._id]); assert.equal(campaign.sender, owner.email);
    let options; let release; let started;
    const exchanging = new Promise(resolve => { started = resolve; }); const blocked = new Promise(resolve => { release = resolve; });
    const client = { generateAuthUrl(value) { options = value; return 'https://accounts.google.com/mock'; },
      async getToken() { started(); await blocked; return { tokens: { scope: 'openid email https://www.googleapis.com/auth/gmail.send', id_token: 'identity', refresh_token: 'replacement-token' } }; },
      async verifyIdToken() { return { getPayload: () => ({ email: 'replacement-sender@example.test', email_verified: true }) }; } };
    await createGmailAuthorization(owner, 'session', { client, now });
    const completing = completeGmailAuthorization(owner, 'session', { state: options.state, code: 'code' }, { client, now });
    await exchanging; release(); await completing;
    const stored = await Campaign.findById(campaign._id);
    assert.equal(stored.status, 'cancelled'); assert.ok(stored.revision > campaign.revision);
    await assert.rejects(approveCampaignService(owner._id, campaign._id, { revision: campaign.revision, now }), /changed|sender|account/i);
    let sends = 0; await processCampaignQueue({ now, send: async () => { sends++; return { id: 'wrong-sender' }; } }); assert.equal(sends, 0);
  });

  await t.test('approval never silently adopts a changed sender during OAuth completion', async () => {
    await reset(); const owner = await user(); await connect(owner); const draft = await thread(owner);
    const campaign = await createCampaign(owner._id, [draft._id]);
    await GmailConnection.updateOne({ user: owner._id }, { $set: { email: 'new-sender@example.test', connectionVersion: 'new-connection' } });
    await assert.rejects(approveCampaignService(owner._id, campaign._id, { revision: campaign.revision, now }), /sending account|sender|connection/i);
    assert.equal((await Campaign.findById(campaign._id)).status, 'draft');
  });

  await t.test('first Gmail connection invalidates empty-sender drafts and requires a new reviewed campaign', async () => {
    await reset(); const owner = await user(); const draft = await thread(owner);
    const initial = await createCampaign(owner._id, [draft._id]); assert.equal(initial.sender, '');
    let options;
    const client = { generateAuthUrl(value) { options = value; return 'https://accounts.google.com/mock'; },
      async getToken() { return { tokens: { scope: 'openid email https://www.googleapis.com/auth/gmail.send', id_token: 'identity', refresh_token: 'first-token' } }; },
      async verifyIdToken() { return { getPayload: () => ({ email: owner.email, email_verified: true }) }; } };
    await createGmailAuthorization(owner, 'session', { client, now });
    await completeGmailAuthorization(owner, 'session', { state: options.state, code: 'code' }, { client, now });
    const stale = await Campaign.findById(initial._id); assert.equal(stale.status, 'cancelled'); assert.ok(stale.revision > initial.revision);
    await assert.rejects(approveCampaignService(owner._id, initial._id, { revision: initial.revision, now }), /changed|sender|account/i);
    const reviewed = await createCampaign(owner._id, [draft._id]); assert.equal(reviewed.sender, owner.email);
    assert.equal((await approveCampaignService(owner._id, reviewed._id, { revision: reviewed.revision, now })).status, 'approved');
  });

  await t.test('disconnect invalidates an OAuth callback already exchanging its code', async () => {
    await reset(); const owner = await user(); let options; let release; let started;
    const exchanging = new Promise(resolve => { started = resolve; }); const blocked = new Promise(resolve => { release = resolve; });
    const client = { generateAuthUrl(value) { options = value; return 'https://accounts.google.com/mock'; },
      async getToken() { started(); await blocked; return { tokens: { scope: 'openid email https://www.googleapis.com/auth/gmail.send', id_token: 'identity', refresh_token: 'private-token' } }; },
      async verifyIdToken() { return { getPayload: () => ({ email: owner.email, email_verified: true }) }; } };
    await createGmailAuthorization(owner, 'session', { client, now });
    const completing = completeGmailAuthorization(owner, 'session', { state: options.state, code: 'code' }, { client, now });
    await exchanging; await disconnectGmail(owner._id, { clientFactory: () => ({ async revokeToken() {} }) }); release();
    await assert.rejects(completing, /disconnect|changed|expired/i);
    assert.equal((await getGmailStatus(owner._id)).connected, false);
  });

  await t.test('slow earlier users cannot make later users reuse an old tick timestamp', async () => {
    await reset(); const firstOwner = await user(); const laterOwner = await user(); await connect(firstOwner); await connect(laterOwner);
    const firstThread = await thread(firstOwner); const laterThreads = await Promise.all([thread(laterOwner), thread(laterOwner)]);
    const firstCampaign = await createCampaign(firstOwner._id, [firstThread._id]); await approveCampaign(firstOwner._id, firstCampaign._id, { now });
    const laterCampaign = await createCampaign(laterOwner._id, laterThreads.map(value => value._id)); await approveCampaign(laterOwner._id, laterCampaign._id, { now });
    let milliseconds = now.getTime(); const calls = [];
    const sender = async connection => { calls.push({ user: String(connection.user), at: milliseconds }); if (String(connection.user) === String(firstOwner._id)) milliseconds += 240000; return { id: `clock-${calls.length}` }; };
    await processCampaignQueue({ clock: () => new Date(milliseconds), send: sender });
    assert.equal(calls.filter(value => value.user === String(laterOwner._id)).length, 1);
    assert.equal((await GmailConnection.findOne({ user: laterOwner._id })).nextSendAt.getTime(), milliseconds + 180000);
    milliseconds += 179000; await processCampaignQueue({ clock: () => new Date(milliseconds), send: sender }); assert.equal(calls.length, 2);
    milliseconds += 1000; await processCampaignQueue({ clock: () => new Date(milliseconds), send: sender }); assert.equal(calls.length, 3);
  });

  await t.test('spacing is refreshed at the actual Gmail handoff after slow access-token preparation', async () => {
    await reset(); const owner = await user(); await connect(owner); const drafts = await Promise.all([thread(owner), thread(owner)]);
    const campaign = await createCampaign(owner._id, drafts.map(value => value._id)); await approveCampaign(owner._id, campaign._id, { now });
    let milliseconds = now.getTime(); let calls = 0;
    const sender = (connection, message, hooks) => sendGmailMessage(connection, message, { beforeSend: hooks.beforeSend,
      client: { setCredentials() {}, async getAccessToken() { milliseconds += 240000; return { token: 'fake-access-token' }; } },
      request: async () => { calls++; return { ok: true, async json() { return { id: `handoff-${calls}` }; } }; } });
    await processCampaignQueue({ clock: () => new Date(milliseconds), send: sender });
    assert.equal(calls, 1); assert.equal((await GmailConnection.findOne({ user: owner._id })).nextSendAt.getTime(), milliseconds + 180000);
  });

  await t.test('OAuth state is session bound, expiring and one use, identity comes from verified Google token', async () => {
    await reset(); const owner = await user(); let options; let exchanges = 0;
    const client = { generateAuthUrl(value) { options = value; return 'https://accounts.google.com/mock'; },
      async getToken({ codeVerifier }) { exchanges++; assert.ok(codeVerifier.length > 40); return { tokens: { scope: 'openid email https://www.googleapis.com/auth/gmail.send', id_token: 'id-token', refresh_token: 'private-refresh' } }; },
      async verifyIdToken({ audience }) { assert.equal(audience, 'gmail-test-client'); return { getPayload: () => ({ email: 'verified-sender@example.test', email_verified: true }) }; } };
    await createGmailAuthorization(owner, 'session-one', { client, now });
    assert.equal(options.code_challenge_method, 'S256');
    assert.ok(options.scope.includes('https://www.googleapis.com/auth/gmail.send'));
    await assert.rejects(completeGmailAuthorization(owner, 'session-two', { state: options.state, code: 'code' }, { client, now }), /expired|declined/);
    assert.equal(exchanges, 0);
    await completeGmailAuthorization(owner, 'session-one', { state: options.state, code: 'code' }, { client, now });
    assert.deepEqual(await getGmailStatus(owner._id), { connected: true, email: 'verified-sender@example.test' });
    assert.ok(!(await GmailConnection.findOne({ user: owner._id })).toJSON().encryptedRefreshToken);
    await assert.rejects(completeGmailAuthorization(owner, 'session-one', { state: options.state, code: 'code' }, { client, now }), /expired|declined/);
    await createGmailAuthorization(owner, 'session-one', { client, now });
    await assert.rejects(completeGmailAuthorization(owner, 'session-one', { state: options.state, code: 'code' }, { client, now: new Date(now.getTime() + 11 * 60000) }), /expired|declined/);
    await User.updateOne({ _id: owner._id }, { $set: { outreachDeletingAt: now } });
    await assert.rejects(createGmailAuthorization(owner, 'session-one', { client, now }), /no longer active/);
  });

  await t.test('campaigns enforce ownership, recipient confirmation, revision checks and frozen approval', async () => {
    await reset(); const owner = await user(); const stranger = await user(); await connect(owner); const draft = await thread(owner);
    await assert.rejects(createCampaign(stranger._id, [draft._id]), /not found/);
    let campaign = await createCampaign(owner._id, [draft._id]);
    await assert.rejects(getCampaign(stranger._id, campaign._id), /not found/);
    campaign = await updateCampaign(owner._id, campaign._id, { items: [{ _id: campaign.items[0]._id, email: 'other@example.test' }] });
    assert.equal(campaign.items[0].emailStatus, 'unverified');
    await assert.rejects(approveCampaign(owner._id, campaign._id, { now }), /explicitly confirmed/);
    campaign = await updateCampaign(owner._id, campaign._id, { items: [{ _id: campaign.items[0]._id, emailConfirmed: true }] });
    await approveCampaign(owner._id, campaign._id, { now });
    await assert.rejects(updateCampaign(owner._id, campaign._id, { items: [] }), /frozen/);
    await assert.rejects(approveCampaign(owner._id, campaign._id, { now }), /already/);
    const stale = await createCampaign(owner._id, [draft._id]);
    await OutreachThread.updateOne({ _id: draft._id }, { $inc: { revision: 1 } });
    await assert.rejects(approveCampaign(owner._id, stale._id, { now }), /changed/);
  });

  await t.test('drafting is not sending; atomic workers space sends across campaigns and preserve manual replies', async () => {
    await reset(); const owner = await user(); await connect(owner); const first = await thread(owner); const second = await thread(owner, { status: 'replied' });
    const campaignA = await createCampaign(owner._id, [first._id]); const campaignB = await createCampaign(owner._id, [second._id]); let sent = 0;
    const sender = async () => { sent++; return { id: `sent-${sent}` }; };
    await processCampaignQueue({ now, send: sender }); assert.equal(sent, 0);
    await approveCampaign(owner._id, campaignA._id, { now }); await approveCampaign(owner._id, campaignB._id, { now });
    const independentWorker = await import('../src/services/campaignService.js?worker=two');
    await Promise.all([processCampaignQueue({ now, send: sender }), independentWorker.processCampaignQueue({ now, send: sender })]);
    assert.equal(sent, 1, 'concurrent workers share a durable per-user reservation');
    await processCampaignQueue({ now: new Date(now.getTime() + 179000), send: sender }); assert.equal(sent, 1);
    await processCampaignQueue({ now: new Date(now.getTime() + 180000), send: sender }); assert.equal(sent, 2);
    assert.equal((await OutreachThread.findById(first._id)).status, 'sent');
    assert.equal((await OutreachThread.findById(second._id)).status, 'replied');
    assert.ok((await OutreachThread.findById(first._id)).followUpAt);
  });

  await t.test('rolling daily limits persist across worker restarts', async () => {
    await reset(); const owner = await user(); await connect(owner);
    const threads = await Promise.all(Array.from({ length: 26 }, () => thread(owner)));
    const campaign = await createCampaign(owner._id, threads.map(value => value._id)); await approveCampaign(owner._id, campaign._id, { now });
    let sent = 0; const sender = async () => ({ id: `daily-${++sent}` });
    for (let index = 0; index < 26; index++) await processCampaignQueue({ now: new Date(now.getTime() + index * 180000), send: sender });
    assert.equal(sent, 25);
    const stored = await Campaign.findById(campaign._id); assert.equal(stored.items.filter(item => item.status === 'queued').length, 1);
    await processCampaignQueue({ now: new Date(now.getTime() + 24 * 60 * 60000), send: sender }); assert.equal(sent, 26);
  });

  await t.test('uncertain provider outcomes and abandoned claims never retry automatically', async () => {
    await reset(); const owner = await user(); await connect(owner); const draft = await thread(owner);
    const campaign = await createCampaign(owner._id, [draft._id]); await approveCampaign(owner._id, campaign._id, { now });
    let attempts = 0;
    await processCampaignQueue({ now, send: async () => { attempts++; throw new Error('timeout'); } });
    assert.equal((await Campaign.findById(campaign._id)).items[0].status, 'review_required');
    await processCampaignQueue({ now: new Date(now.getTime() + 3600000), send }); assert.equal(attempts, 1);
    const abandoned = await createCampaign(owner._id, [draft._id]); await approveCampaign(owner._id, abandoned._id, { now });
    await Campaign.updateOne({ _id: abandoned._id }, { $set: { 'items.0.status': 'sending', 'items.0.claimedAt': new Date(now.getTime() - 11 * 60000), 'items.0.claimToken': 'interrupted' } });
    await processCampaignQueue({ now, send: async () => { attempts++; return { id: 'unexpected' }; } });
    assert.equal((await Campaign.findById(abandoned._id)).items[0].status, 'review_required'); assert.equal(attempts, 1);
  });

  await t.test('cancel and disconnect stop unsent items; deletion during provider completion cannot recreate data', async () => {
    await reset(); const owner = await user(); await connect(owner); const draft = await thread(owner);
    const cancelled = await createCampaign(owner._id, [draft._id]); await approveCampaign(owner._id, cancelled._id, { now }); await cancelCampaign(owner._id, cancelled._id);
    let sends = 0; await processCampaignQueue({ now, send: async () => { sends++; return { id: 'unexpected' }; } }); assert.equal(sends, 0);
    const disconnected = await createCampaign(owner._id, [draft._id]); await approveCampaign(owner._id, disconnected._id, { now });
    let revokes = 0; await disconnectGmail(owner._id, { clientFactory: () => ({ async revokeToken() { revokes++; throw new Error('Google unavailable'); } }) });
    assert.equal(revokes, 1); assert.equal((await Campaign.findById(disconnected._id)).status, 'cancelled'); assert.equal((await getGmailStatus(owner._id)).connected, false);
    await GmailConnection.deleteMany({}); await connect(owner);
    const deleting = await createCampaign(owner._id, [draft._id]); await approveCampaign(owner._id, deleting._id, { now });
    await processCampaignQueue({ now, send: async () => {
      await User.deleteOne({ _id: owner._id }); await OutreachThread.deleteMany({ user: owner._id }); await cleanupUserCampaignData(owner._id, { revoke: false });
      return { id: 'in-flight-send' };
    } });
    assert.equal(await Campaign.countDocuments({ user: owner._id }), 0); assert.equal(await OutreachThread.countDocuments({ user: owner._id }), 0); assert.equal(await GmailConnection.countDocuments({ user: owner._id }), 0);
  });

  await t.test('authenticated HTTP campaign editing, approval, errors and CSRF use established API conventions', async () => {
    await reset(); const owner = await user(); const stranger = await user(); await connect(owner); const draft = await thread(owner);
    process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'gmail-campaign-http-tests-at-least-32-characters'; process.env.CORS_ORIGIN = 'http://localhost:5173'; process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    const [{ createApp }, { default: jwt }] = await Promise.all([import('../src/app.js'), import('jsonwebtoken')]);
    const server = createApp().listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const csrfResponse = await fetch(`${base}/api/auth/csrf-token`, { headers: { Origin: process.env.CORS_ORIGIN } });
      const { token: csrf } = await csrfResponse.json(); const csrfCookies = csrfResponse.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      async function request(path, { method = 'GET', body, as = owner, csrfEnabled = true } = {}) {
        const response = await fetch(`${base}/api/user${path}`, { method, redirect: 'manual', headers: { Origin: process.env.CORS_ORIGIN, 'Content-Type': 'application/json',
          Cookie: `jobverify_token=${jwt.sign({ id: String(as._id), sessionVersion: as.sessionVersion }, process.env.JWT_SECRET)}; ${csrfCookies}`,
          ...(csrfEnabled ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, location: response.headers.get('location'), body: response.headers.get('content-type')?.includes('json') ? await response.json() : null };
      }
      assert.deepEqual((await request('/gmail')).body.data, { connected: true, email: owner.email });
      assert.equal((await request('/campaigns', { method: 'POST', body: { threadIds: [draft._id] }, csrfEnabled: false })).status, 403);
      const created = await request('/campaigns', { method: 'POST', body: { threadIds: [draft._id], user: stranger._id } });
      assert.equal(created.status, 201, JSON.stringify(created.body)); const id = created.body.data._id;
      assert.equal((await request(`/campaigns/${id}`, { as: stranger })).status, 404);
      assert.equal((await request(`/campaigns/${id}`, { method: 'PATCH', body: { revision: created.body.data.revision, items: [{ _id: created.body.data.items[0]._id, subject: 'Injected\r\nBcc: other@example.test' }] } })).status, 400);
      const approved = await request(`/campaigns/${id}/send`, { method: 'POST', body: { revision: created.body.data.revision } }); assert.equal(approved.status, 200); assert.equal(approved.body.data.status, 'approved');
      assert.ok(!JSON.stringify(approved.body).includes('connectionVersion'));
      assert.equal((await request(`/campaigns/${id}`, { method: 'PATCH', body: { revision: approved.body.data.revision, items: [] } })).status, 409);
      assert.equal((await request(`/campaigns/${id}/cancel`, { method: 'POST' })).body.data.status, 'cancelled');
      const callback = await request('/gmail/callback?state=invalid&code=invalid'); assert.equal(callback.status, 302); assert.equal(callback.location, 'http://localhost:5173/profile?gmail=failed');
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
});
