import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import Application from '../src/models/Application.js';
import ApplicationEvent from '../src/models/ApplicationEvent.js';
import Mailbox from '../src/models/ApplicationMailbox.js';
import Message from '../src/models/ApplicationMail.js';
import { recordApplicationOpen } from '../src/services/applicationService.js';
import { ingestApplicationMessage, resolveApplicationMail, disconnectApplicationMailbox } from '../src/services/applicationMailboxService.js';
import { verifyApplicationDkim } from '../src/services/applicationMailAuthentication.js';
import { jobUrl, trustRules, signedReceipt, policyVerifier, mailauthAvailable, dnsRecords } from './helpers/applicationMailFixtures.js';

test('mailbox authentication mutation boundary, owner choices and concurrent lifecycle changes', { timeout: 90000 }, async t => {
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Mailbox.init(), Message.init(), Application.init(), ApplicationEvent.init()]);
  async function fixture() {
    const user = { _id: new mongoose.Types.ObjectId() };
    user.email = `${user._id}@example.test`;
    await User.collection.insertOne(user);
    const connection = (await Mailbox.create({ user: user._id, email: 'candidate@example.test', connected: true, connectionVersion: 'initial' })).toObject();
    const application = await recordApplicationOpen(user._id, { _id: new mongoose.Types.ObjectId(), company: 'Acme Inc', title: 'Backend Engineer', applicationUrl: jobUrl });
    return { user, connection, application };
  }
  const policyOptions = { rules: trustRules, verify: policyVerifier };

  await t.test('unsupported MIME still leaves a recognizable receipt for owner review', async () => {
    const { user, connection, application } = await fixture();
    const receipt = signedReceipt('unsupported-mime');
    receipt.raw = Buffer.from(Buffer.from(receipt.raw, 'base64url').toString().replace('charset=utf-8', 'charset=unknown')).toString('base64url');
    await ingestApplicationMessage(connection, receipt, policyOptions);
    const pending = await Message.findOne({ user: user._id, messageId: receipt.id });
    assert.ok(pending, 'Recognizable unsupported receipts must remain reviewable');
    assert.equal(pending.status, 'pending');
    assert.equal(pending.application, null);
    assert.equal((await Application.findById(application._id)).status, 'opened');
  });

  for (const [name, contentType, reason, dismiss] of [
    ['ISO-8859-1', 'text/plain; charset=iso-8859-1', 'unsupported_charset', false],
    ['format=flowed', 'text/plain; charset=utf-8; format=flowed', 'unsupported_mime', true],
    ['unsupported multipart boundary', 'multipart/alternative; boundary="===============123=="', 'unsupported_mime', true],
  ]) await t.test(`body-only acknowledgement with ${name} remains pending for an explicit owner choice`, async () => {
    const { user, connection, application } = await fixture();
    const shape = name === 'unsupported multipart boundary' ? { text: `--===============123==\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nThank you for applying to Acme Inc for Backend Engineer.\r\n${jobUrl}\r\n--===============123==--\r\n` } : {};
    const receipt = signedReceipt('body-only-unsupported', { subject: 'Your Acme update', contentType, ...shape });
    let verifications = 0;
    const options = { rules: trustRules, verify: async bytes => { verifications++; return policyVerifier(bytes); } };
    await ingestApplicationMessage(connection, receipt, options);
    await ingestApplicationMessage(connection, receipt, options);
    const pending = await Message.findOne({ user: user._id, messageId: receipt.id }).select('+trust').lean();
    assert.ok(pending, 'Unsupported interpretation must not silently discard a body-only receipt');
    assert.equal(pending.subject, 'Your Acme update');
    assert.equal(pending.status, 'pending');
    assert.equal(pending.application, null);
    assert.equal(pending.trust.reason, reason);
    assert.equal(verifications, 0, 'Unsupported interpretation must never reach the automatic verifier');
    assert.equal((await Application.findById(application._id)).status, 'opened');
    assert.equal(await Message.countDocuments({ user: user._id, messageId: receipt.id }), 1);
    await resolveApplicationMail(user._id, pending._id, dismiss ? { dismiss: true } : { applicationId: String(application._id) });
    await ingestApplicationMessage(connection, receipt, options);
    assert.equal((await Message.findById(pending._id)).status, dismiss ? 'dismissed' : 'linked');
  });

  await t.test('unusable sender Date uses valid provider time for owner review only', async () => {
    const { user, connection, application } = await fixture();
    let verifications = 0;
    const options = { rules: trustRules, verify: async bytes => { verifications++; return policyVerifier(bytes); } };
    const providerTime = new Date();
    for (const [id, value] of [['missing-date', null], ['invalid-date', 'not a date'], ['future-date', new Date(Date.now() + 86400000).toUTCString()]]) {
      const receipt = signedReceipt(id, { subject: 'Your Acme update' });
      receipt.raw = Buffer.from(Buffer.from(receipt.raw, 'base64url').toString().replace(/^Date: [^\r\n]*\r\n/m, value === null ? '' : `Date: ${value}\r\n`)).toString('base64url');
      receipt.internalDate = String(providerTime.getTime());
      await ingestApplicationMessage(connection, receipt, options);
      const pending = await Message.findOne({ user: user._id, messageId: id }).select('+trust').lean();
      assert.ok(pending, `${id} must remain reviewable using provider time`);
      assert.equal(pending.status, 'pending');
      assert.equal(pending.application, null);
      assert.equal(pending.receivedAt.getTime(), providerTime.getTime());
      assert.equal(pending.trust.status, 'pending');
      assert.equal(pending.trust.reason, 'message_date_review');
    }
    assert.equal(verifications, 0, 'Provider time must never supply automatic evidence');
    assert.equal((await Application.findById(application._id)).status, 'opened');
  });

  await t.test('unsupported review fallback preserves RAW size, encoding and date rejection', async () => {
    const { user, connection } = await fixture();
    const receipt = signedReceipt('invalid-unsupported', { subject: 'Your Acme update', contentType: 'text/plain; charset=iso-8859-1' });
    for (const raw of [
      { ...receipt, raw: 'not valid base64url!!' },
      { ...receipt, raw: Buffer.from('x'.repeat(600000)).toString('base64url') },
      signedReceipt(receipt.id, { subject: 'Your Acme update', contentType: 'text/plain; charset=iso-8859-1', date: new Date(Date.now() + 86400000) }),
    ]) assert.equal(await ingestApplicationMessage(connection, raw, policyOptions), null);
    assert.equal(await Message.countDocuments({ user: user._id }), 0);
  });

  await t.test('unavailable real verifier stays pending and owner can dismiss after same-mailbox reconnect', async () => {
    const { user, connection, application } = await fixture();
    const receipt = signedReceipt('unavailable');
    await ingestApplicationMessage(connection, receipt, { rules: trustRules, verify: async () => { throw Object.assign(new Error('unavailable'), { code: 'verifier_unavailable' }); } });
    const row = await Message.findOne({ user: user._id, messageId: receipt.id }).select('+trust').lean();
    assert.equal(row.application, null);
    assert.equal(row.trust.reason, 'verifier_unavailable');
    assert.equal((await Application.findById(application._id)).status, 'opened');
    await Mailbox.updateOne({ _id: connection._id }, { $set: { connectionVersion: 'reconnected' } });
    await resolveApplicationMail(user._id, row._id, { dismiss: true });
    assert.equal((await Message.findById(row._id)).status, 'dismissed');
  });

  await t.test('fresh policy proof gates retries and duplicate deliveries reuse existing evidence keys (crypto double)', async () => {
    const { user, connection, application } = await fixture();
    const receipt = signedReceipt('automatic');
    await ingestApplicationMessage(connection, receipt, policyOptions);
    await ingestApplicationMessage(connection, receipt, policyOptions);
    await ingestApplicationMessage(connection, { ...receipt, id: 'redelivered' }, policyOptions);
    const saved = await Application.findById(application._id);
    assert.equal(saved.status, 'applied');
    assert.equal(saved.evidence.length, 1);
    assert.equal(await Message.countDocuments({ user: user._id, status: 'linked' }), 2);
    assert.equal(await ApplicationEvent.countDocuments({ user: user._id, kind: 'submission_confirmed' }), 1);
    const pending = await Message.create({ user: user._id, mailboxEmail: connection.email, connectionVersion: 'old', messageId: 'stale-proof',
      subject: 'Application received', receivedAt: new Date(), application: application._id, trust: { status: 'authenticated', proof: 'a'.repeat(64), verifiedAt: new Date() } });
    await ingestApplicationMessage(connection, { ...receipt, id: 'stale-proof' }, { rules: [] });
    const reloaded = await Message.findById(pending._id);
    assert.equal(reloaded.status, 'pending');
    assert.equal(reloaded.application, null, 'Persisted proof and a legacy guess cannot authorize a retry');
  });

  await t.test('legacy guesses can be rebound or dismissed without changing handled history', async () => {
    const { user, connection, application } = await fixture();
    const other = await recordApplicationOpen(user._id, { _id: new mongoose.Types.ObjectId(), company: 'Other', title: 'Other Role' });
    const legacy = id => ({ user: user._id, mailboxEmail: connection.email, connectionVersion: 'previous-connection', messageId: id, subject: 'Application received', receivedAt: new Date(), application: application._id });
    const rebind = await Message.create(legacy('legacy-link'));
    await resolveApplicationMail(user._id, rebind._id, { applicationId: String(other._id) });
    assert.equal(String((await Message.findById(rebind._id)).application), String(other._id));
    assert.equal((await Application.findById(application._id)).status, 'opened');
    const dismiss = await Message.create(legacy('legacy-dismiss'));
    await resolveApplicationMail(user._id, dismiss._id, { dismiss: true });
    await ingestApplicationMessage(connection, signedReceipt('legacy-dismiss'), policyOptions);
    assert.equal((await Message.findById(dismiss._id)).status, 'dismissed');
    await ingestApplicationMessage(connection, signedReceipt('legacy-link'), policyOptions);
    assert.equal(String((await Message.findById(rebind._id)).application), String(other._id));
  });

  await t.test('automatic evidence uses current authenticated bytes instead of legacy FULL metadata', async () => {
    const { user, connection, application } = await fixture();
    const receipt = signedReceipt('legacy-metadata', { subject: 'Application received by Acme Inc' });
    const row = await Message.create({ user: user._id, mailboxEmail: connection.email, connectionVersion: 'old', messageId: receipt.id,
      subject: 'Untrusted legacy display subject', sender: 'Untrusted legacy sender', receivedAt: new Date('2000-01-01') });
    await ingestApplicationMessage(connection, receipt, policyOptions);
    const saved = await Application.findById(application._id);
    assert.equal(saved.evidence[0].summary, 'Application received by Acme Inc');
    assert.ok(saved.evidence[0].observedAt > new Date('2026-01-01'));
    assert.equal((await Message.findById(row._id)).subject, 'Application received by Acme Inc');
  });

  for (const action of ['disconnect', 'delete']) await t.test(`${action} while verification waits prevents evidence and late inserts`, async () => {
    const { user, connection, application } = await fixture();
    let release; let started;
    const ready = new Promise(resolve => { started = resolve; });
    const waiting = new Promise(resolve => { release = resolve; });
    const ingest = ingestApplicationMessage(connection, signedReceipt('waiting-' + action), { rules: trustRules, verify: async bytes => { started(); await waiting; return policyVerifier(bytes); } });
    const rejected = assert.rejects(ingest);
    await ready;
    if (action === 'disconnect') await disconnectApplicationMailbox(user._id);
    else { await User.deleteOne({ _id: user._id }); await Message.deleteMany({ user: user._id }); }
    release(); await rejected;
    assert.equal((await Application.findById(application._id)).status, 'opened');
    assert.equal(await Message.countDocuments({ user: user._id }), 0);
  });

  await t.test('an explicit owner link racing a fresh ingest is preserved', async () => {
    const { user, connection, application } = await fixture();
    const other = await recordApplicationOpen(user._id, { _id: new mongoose.Types.ObjectId(), company: 'Other', title: 'Other Role' });
    const receipt = signedReceipt('owner-race');
    await ingestApplicationMessage(connection, receipt, { rules: [] });
    const row = await Message.findOne({ user: user._id, messageId: receipt.id });
    let started; let release;
    const ready = new Promise(resolve => { started = resolve; });
    const wait = new Promise(resolve => { release = resolve; });
    const ingest = ingestApplicationMessage(connection, receipt, { rules: trustRules, verify: async bytes => { started(); await wait; return policyVerifier(bytes); } });
    await ready;
    await resolveApplicationMail(user._id, row._id, { applicationId: String(other._id) });
    release(); await ingest;
    assert.equal(String((await Message.findById(row._id)).application), String(other._id));
    assert.equal((await Application.findById(application._id)).status, 'opened');
  });

  await t.test('real mailauth verifies a generated signature, rejects tampering and automatically links a trusted receipt', { skip: !mailauthAvailable && 'mailauth8.0.4 unavailable: dependency/network gate; policy doubles do not validate crypto' }, async () => {
    const { user, connection, application } = await fixture();
    const receipt = signedReceipt('crypto-valid');
    const options = { rules: trustRules, verify: bytes => verifyApplicationDkim(bytes, { dnsRecords }) };
    await ingestApplicationMessage(connection, receipt, options);
    assert.equal((await Application.findById(application._id)).status, 'applied');
    const changed = { ...receipt, id: 'crypto-tampered', raw: Buffer.from(Buffer.from(receipt.raw, 'base64url').toString().replace('Thank you', 'Thanks to you')).toString('base64url') };
    await ingestApplicationMessage(connection, changed, options);
    assert.equal((await Message.findOne({ user: user._id, messageId: changed.id })).status, 'pending');
    const plain = `Thank you for applying to Acme Inc for Backend Engineer.\r\n${jobUrl}\r\n`;
    const multipart = `--receipt\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${plain}\r\n--receipt\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Thank you for applying to Acme Inc for Backend Engineer.<br><a href="${jobUrl}">${jobUrl}</a></p>\r\n--receipt--\r\n`;
    for (const [name, shape] of [
      ['base64', { transferEncoding: 'base64', text: Buffer.from(plain).toString('base64') }],
      ['quoted-printable', { transferEncoding: 'quoted-printable', subject: '=?UTF-8?B?QXBwbGljYXRpb24gcmVjZWl2ZWQg4pyT?=', text: plain.replace('https:', 'https=3A') }],
      ['multipart', { contentType: 'multipart/alternative; boundary="receipt"', text: multipart }],
    ]) {
      const sample = signedReceipt('crypto-' + name, shape);
      await ingestApplicationMessage(connection, sample, options);
      assert.equal((await Message.findOne({ user: user._id, messageId: sample.id })).status, 'linked', name);
    }
  });
});
