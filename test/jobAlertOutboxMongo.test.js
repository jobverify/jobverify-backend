import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';
import Subscription from '../src/models/Subscription.js';
import JobAlertDelivery from '../src/models/JobAlertDelivery.js';
import JobAlertOutbox from '../src/models/JobAlertOutbox.js';
import { claimJobAlertEvent, persistJobChangesWithAlertOutbox, processClaimedJobAlertEvent, recoverJobAlertOutbox } from '../src/services/jobAlertOutboxService.js';
import { updateAlertSchedule } from '../src/services/alertScheduleService.js';
import { saveToDB } from '../scraper-support/utils/saveToDB.js';

test('job persistence retains the alert obligation without a running worker', { timeout: 60000 }, async t => {
  const mongo = await MongoMemoryReplSet.create({
    binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) },
    replSet: { count: 1 },
  });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Job.init(), User.init(), Subscription.init(), JobAlertDelivery.init(), JobAlertOutbox.init()]);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('External sends are forbidden in local outbox tests.'); });
  const source = [{ title: 'Software Engineer', company: 'Example', location: 'Bengaluru, India',
    city: 'Bengaluru', link: 'https://example.com/jobs/outbox-engineer',
    description: 'Build software with JavaScript and Node.js for the engineering team.' }];
  const saved = await saveToDB(source, 'local-outbox-fixture', { replaceExisting: false, refreshDatasetSummary: false });
  assert.equal(saved.inserted, 1);
  const job = await Job.findOne({ source: 'local-outbox-fixture' }).lean();
  assert.ok(job);
  assert.equal(await mongoose.connection.collection('jobalertoutboxes').countDocuments({ job: job._id, status: 'pending' }), 1,
    'Publishing a job must persist pending notification work in the same commit, before any worker runs.');

  const reset = async () => {
    await mongoose.connection.db.command({ collMod: 'jobalertoutboxes', validator: {} });
    await Promise.all([Job.deleteMany({}), User.deleteMany({}), Subscription.deleteMany({}), JobAlertDelivery.deleteMany({}), JobAlertOutbox.deleteMany({})]);
  };
  const publish = (fingerprint = 'outbox-fixture', extra = {}) => persistJobChangesWithAlertOutbox(Job, [{ updateOne: {
    filter: { fingerprint }, update: { $set: { fingerprint, title: 'Software Engineer', company: 'Example', city: 'Bengaluru',
      sourceUrl: 'https://example.com/jobs/test', status: 'active', ...extra } }, upsert: true,
  } }]);
  const subscriber = (email, extra = {}) => User.create({ email,
    premium: { planId: 'semester', status: 'active', telegramAlertsEnabled: true },
    telegram: { chatId: email, linkedAt: new Date() }, profile: { telegramAlertFilters: { company: ['Example'] } }, ...extra });

  await t.test('failed outbox persistence rolls back a new job and updates in the same batch', async () => {
    await reset();
    const old = await Job.create({ fingerprint: 'existing', title: 'Before', company: 'Example' });
    await mongoose.connection.db.command({ collMod: 'jobalertoutboxes', validator: { status: { $ne: 'pending' } } });
    await assert.rejects(persistJobChangesWithAlertOutbox(Job, [
      { updateOne: { filter: { _id: old._id }, update: { $set: { title: 'After' } } } },
      { updateOne: { filter: { fingerprint: 'new' }, update: { $set: { title: 'New', company: 'Example', status: 'active' } }, upsert: true } },
    ]));
    assert.equal(await Job.countDocuments(), 1);
    assert.equal((await Job.findById(old._id)).title, 'Before');
    assert.equal(await JobAlertOutbox.countDocuments(), 0);
  });

  await t.test('restart recovery persists matching deliveries and completion without sending', async () => {
    await reset(); const owner = await subscriber('owner@example.test');
    await subscriber('opted-out@example.test', { premium: { planId: 'semester', status: 'active', telegramAlertsEnabled: false } });
    await subscriber('unmatched@example.test', { profile: { telegramAlertFilters: { company: ['Different'] } } });
    await updateAlertSchedule(owner._id, { frequency: 'daily', isActive: false, deliveryTime: '10:30', weeklyDay: 'Monday' });
    await publish();
    assert.equal(await JobAlertDelivery.countDocuments(), 0);
    assert.deepEqual(await recoverJobAlertOutbox(), { completed: 1, failed: 0 });
    const delivery = await JobAlertDelivery.findOne();
    assert.equal(await JobAlertDelivery.countDocuments(), 1);
    assert.equal(String(delivery.user), String(owner._id));
    assert.equal(delivery.schedulePaused, true);
    assert.ok(delivery.scheduledFor > new Date());
    assert.equal((await JobAlertOutbox.findOne()).status, 'completed');
  });

  await t.test('claim expiry recovers work and excludes the original worker', async () => {
    await reset(); await subscriber('owner@example.test'); await publish();
    const stale = await claimJobAlertEvent();
    assert.equal(await claimJobAlertEvent(), null);
    await JobAlertOutbox.updateOne({ _id: stale._id }, { $set: { claimExpiresAt: new Date(0) } });
    const current = await claimJobAlertEvent();
    assert.notEqual(current.claimToken, stale.claimToken);
    assert.equal(await processClaimedJobAlertEvent(stale), false);
    assert.equal(await processClaimedJobAlertEvent(current), true);
    assert.equal(await JobAlertDelivery.countDocuments(), 1);
  });

  await t.test('completion failure rolls back all recipient rows and schedules a retry', async () => {
    await reset(); await subscriber('owner@example.test'); await publish();
    await mongoose.connection.db.command({ collMod: 'jobalertoutboxes', validator: { status: { $ne: 'completed' } } });
    assert.deepEqual(await recoverJobAlertOutbox(), { completed: 0, failed: 1 });
    assert.equal(await JobAlertDelivery.countDocuments(), 0);
    const failed = await JobAlertOutbox.findOne();
    assert.equal(failed.status, 'pending');
    assert.ok(failed.nextAttemptAt > new Date());
    await mongoose.connection.db.command({ collMod: 'jobalertoutboxes', validator: {} });
    await JobAlertOutbox.updateOne({ _id: failed._id }, { $set: { nextAttemptAt: new Date(0) } });
    assert.deepEqual(await recoverJobAlertOutbox(), { completed: 1, failed: 0 });
    assert.equal(await JobAlertDelivery.countDocuments(), 1);
  });

  await t.test('concurrent workers and replay after delivery cleanup cannot fan out twice', async () => {
    await reset(); await subscriber('owner@example.test'); await publish();
    const event = await claimJobAlertEvent();
    const outcomes = await Promise.all([processClaimedJobAlertEvent(event), processClaimedJobAlertEvent(event)]);
    assert.equal(outcomes.filter(Boolean).length, 1);
    assert.equal(await JobAlertDelivery.countDocuments(), 1);
    await JobAlertDelivery.deleteMany({}); // The sender cleans up acknowledged rows.
    assert.equal(await processClaimedJobAlertEvent(event), false);
    await publish('outbox-fixture', { title: 'Updated job description' });
    assert.deepEqual(await recoverJobAlertOutbox(), { completed: 0, failed: 0 });
    assert.equal(await JobAlertDelivery.countDocuments(), 0);
    assert.equal(await JobAlertOutbox.countDocuments(), 1);
  });

  await t.test('inactive inserts do not alert and jobs removed before fanout complete safely', async () => {
    await reset(); await publish('inactive', { status: 'expired' });
    assert.equal(await JobAlertOutbox.countDocuments(), 0);
    await publish('removed'); await Job.deleteMany({});
    assert.deepEqual(await recoverJobAlertOutbox(), { completed: 1, failed: 0 });
    assert.equal((await JobAlertOutbox.findOne()).outcome, 'job_unavailable');
    assert.equal(await JobAlertDelivery.countDocuments(), 0);
  });
});
