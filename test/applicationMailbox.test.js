import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import Application from '../src/models/Application.js';
import ApplicationEvent from '../src/models/ApplicationEvent.js';
import { recordApplicationOpen } from '../src/services/applicationService.js';
const mailbox = await import('../src/services/applicationMailboxService.js').catch(() => ({}));

test('Gmail read consent, acknowledgement deduplication, ambiguous review and disconnect', { timeout: 90000 }, async t => {
  assert.equal(typeof mailbox.createMailboxAuthorization, 'function', 'Separate Gmail read authorization must be implemented');
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  const { default: Mailbox } = await import('../src/models/ApplicationMailbox.js');
  const { default: Message } = await import('../src/models/ApplicationMail.js');
  await Promise.all([Mailbox.init(), Message.init(), Application.init(), ApplicationEvent.init()]);
  const user = { _id: new mongoose.Types.ObjectId(), email: 'candidate@example.test', sessionVersion: 0 };
  await User.collection.insertOne(user);
  let grant;
  const client = {
    generateAuthUrl(options) { grant = options; return 'https://accounts.google.com/oauth?' + new URLSearchParams({ state: options.state }); },
    getToken: async () => ({ tokens: { scope: 'openid email https://www.googleapis.com/auth/gmail.readonly', id_token: 'fixture-id', refresh_token: 'fixture-refresh' } }),
    verifyIdToken: async () => ({ getPayload: () => ({ email_verified: true, email: user.email }) }),
  };
  await mailbox.createMailboxAuthorization(user, 'session', { client });
  assert.ok(grant.scope.includes('https://www.googleapis.com/auth/gmail.readonly'));
  assert.ok(!grant.scope.includes('https://www.googleapis.com/auth/gmail.send'));
  await assert.rejects(mailbox.completeMailboxAuthorization(user, 'wrong-session', { state: grant.state, code: 'code' }, { client }));
  await mailbox.completeMailboxAuthorization(user, 'session', { state: grant.state, code: 'code' }, { client });
  await assert.rejects(mailbox.completeMailboxAuthorization(user, 'session', { state: grant.state, code: 'code' }, { client }));
  const connection = await Mailbox.findOne({ user: user._id }).lean();
  assert.equal((await mailbox.getMailboxStatus(user._id)).encryptedRefreshToken, undefined);
  const job = { _id: new mongoose.Types.ObjectId(), title: 'Backend Engineer', company: 'Example Corp' };
  const application = await recordApplicationOpen(user._id, job);
  const raw = (id, text) => ({ id, threadId: 'thread-' + id, internalDate: String(Date.now()), labelIds: ['INBOX'], payload: {
    mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'Your application' }, { name: 'From', value: 'Hiring <hiring@example.test>' }, { name: 'To', value: user.email }],
    body: { data: Buffer.from(text).toString('base64url') },
  } });
  const receipt = raw('receipt-1', 'We have received your application for Backend Engineer at Example Corp.');
  await mailbox.ingestApplicationMessage(connection, receipt);
  await mailbox.ingestApplicationMessage(connection, receipt);
  assert.equal((await Application.findById(application._id)).status, 'opened', 'Unsigned display headers and matching text must not confirm an application');
  const unverified = await Message.findOne({ messageId: 'receipt-1' }).lean();
  assert.equal(unverified.application, null, 'Suggestions must not bind pending mail');
  assert.equal(unverified.status, 'pending');
  await mailbox.resolveApplicationMail(user._id, unverified._id, { applicationId: String(application._id) });
  const confirmed = await Application.findById(application._id).lean();
  assert.equal(confirmed.status, 'applied'); assert.equal(confirmed.confirmationSource, 'email'); assert.equal(confirmed.evidence.length, 1);
  assert.equal(await Message.countDocuments({ user: user._id }), 1);
  const other = await recordApplicationOpen(user._id, { ...job, _id: new mongoose.Types.ObjectId() });
  await mailbox.ingestApplicationMessage(connection, raw('receipt-2', receipt.payload.body.data ? 'Thank you for applying to Example Corp for Backend Engineer.' : ''));
  const ambiguous = await Message.findOne({ messageId: 'receipt-2' }).lean();
  assert.equal(ambiguous.status, 'pending');
  assert.equal((await Application.findById(other._id)).status, 'opened');
  await assert.rejects(mailbox.resolveApplicationMail(new mongoose.Types.ObjectId(), ambiguous._id, { applicationId: String(other._id) }));
  await mailbox.resolveApplicationMail(user._id, ambiguous._id, { applicationId: String(other._id) });
  assert.equal((await Application.findById(other._id)).confirmationSource, 'email');
  await mailbox.ingestApplicationMessage(connection, raw('incomplete', 'Thank you for applying. Please complete your application.'));
  assert.equal(await Message.countDocuments({ messageId: 'incomplete' }), 0);
  const scanStart = new Date(); let pages = 0;
  const syncOptions = { now: scanStart, clientFactory: () => ({ setCredentials() {}, getAccessToken: async () => ({ token: 'fixture-token' }) }),
    request: async (address, options) => {
      const url = new URL(address); assert.equal(url.hostname, 'gmail.googleapis.com'); assert.equal(options.headers.Authorization, 'Bearer fixture-token');
      if (url.pathname.endsWith('/messages')) {
        pages++;
        if (pages === 1) return new Response(JSON.stringify({ messages: [{ id: 'receipt-1' }], nextPageToken: 'page-two' }));
        assert.equal(url.searchParams.get('pageToken'), 'page-two');
        return new Response(JSON.stringify({ messages: [] }));
      }
      assert.equal(url.searchParams.get('format'), 'raw', 'Verification must fetch original RFC5322 bytes');
      return new Response(JSON.stringify(receipt));
    },
  };
  assert.equal((await mailbox.processApplicationMailboxQueue(syncOptions)).hasMore, true);
  assert.equal((await Mailbox.findById(connection._id)).lastSyncedAt, null);
  assert.equal((await mailbox.processApplicationMailboxQueue({ ...syncOptions, now: new Date(scanStart.getTime() + 2000) })).hasMore, false);
  assert.equal((await Mailbox.findById(connection._id)).lastSyncedAt.toISOString(), scanStart.toISOString());
  assert.equal(await Message.countDocuments({ user: user._id }), 2, 'Paging and overlap must not duplicate acknowledgements');
  await Mailbox.updateOne({ _id: connection._id }, { $set: { nextSyncAt: new Date(0) } });
  const bounded = await mailbox.processApplicationMailboxQueue({ ...syncOptions, now: new Date(scanStart.getTime() + 3000), request: async address => {
    const url = new URL(address);
    if (url.pathname.endsWith('/messages')) return new Response(JSON.stringify({ messages: [{ id: 'oversized' }, { id: 'bounded-receipt' }] }));
    if (url.pathname.endsWith('/oversized')) return new Response(new Uint8Array(1000000));
    return new Response(JSON.stringify({ ...receipt, id: 'bounded-receipt' }));
  } });
  assert.equal(bounded.failed, undefined, 'An oversized message must not permanently block the mailbox cursor');
  assert.ok(await Message.exists({ messageId: 'bounded-receipt' }));
  await mailbox.disconnectApplicationMailbox(user._id);
  await assert.rejects(mailbox.ingestApplicationMessage(connection, raw('after-disconnect', 'Thank you for applying to Example Corp.')));
  assert.equal(await Message.countDocuments({ messageId: 'after-disconnect' }), 0);
  await Mailbox.updateOne({ _id: connection._id }, { $set: { connected: true, connectionVersion: connection.connectionVersion } });
  const originalInsert = Message.findOneAndUpdate.bind(Message);
  t.mock.method(Message, 'findOneAndUpdate', async (...args) => {
    await User.deleteOne({ _id: user._id });
    await Message.deleteMany({ user: user._id });
    return originalInsert(...args);
  });
  await assert.rejects(mailbox.ingestApplicationMessage(connection, raw('delete-race', 'Thank you for applying to Example Corp.')));
  assert.equal(await Message.countDocuments({ user: user._id }), 0, 'An in-flight ingest cannot restore deleted account mail');
});
