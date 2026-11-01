import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import Subscription from '../src/models/Subscription.js';
import SiteSettings from '../src/models/SiteSettings.js';
import JobAlertDelivery from '../src/models/JobAlertDelivery.js';
import { queueJobAlertsForJobs, recoverQueuedJobAlerts, buildTelegramMessageBody } from '../src/services/jobAlertService.js';
import { updateAlertSchedule } from '../src/services/alertScheduleService.js';

test('Telegram alert delivery through matching, durable scheduling and provider responses', { timeout: 90000 }, async t => {
  const envKeys = ['MONGOMS_RUNTIME_DOWNLOAD', 'TELEGRAM_ENABLED', 'TELEGRAM_BOT_TOKEN', 'FRONTEND_ORIGIN'];
  const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  });
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  process.env.TELEGRAM_ENABLED = 'true';
  process.env.TELEGRAM_BOT_TOKEN = 'local-fixture-token';
  process.env.FRONTEND_ORIGIN = 'https://jobs.example.test';
  const mongo = await MongoMemoryReplSet.create({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) }, replSet: { count: 1 } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Job.init(), Subscription.init(), JobAlertDelivery.init()]);
  let sequence = 0;
  async function reset() { await Promise.all([User.deleteMany({}), Job.deleteMany({}), Subscription.deleteMany({}), JobAlertDelivery.deleteMany({})]); }
  const user = extra => User.create({ email: `candidate${++sequence}@example.test`,
    premium: { planId: 'semester', status: 'active', telegramAlertsEnabled: true },
    telegram: { chatId: String(sequence), linkedAt: new Date(Date.now() - 60000) },
    profile: { telegramAlertFilters: { company: ['Example'] } }, ...extra });
  const job = extra => Job.create({ title: `Developer ${++sequence}`, company: 'Example', city: 'Bengaluru',
    sourceUrl: `https://employer.example.test/jobs/${sequence}`, fingerprint: `telegram-${sequence}`, status: 'active', ...extra });
  function provider(st, respond = () => ({ ok: true, result: { message_id: 123 } })) {
    const requests = [];
    st.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, 'https://api.telegram.org/botlocal-fixture-token/sendMessage');
      const payload = JSON.parse(options.body); requests.push(payload);
      const body = respond(payload);
      return { ok: body.ok, status: body.ok ? 200 : body.error_code, json: async () => body };
    });
    return requests;
  }

  await t.test('free mode delivers to linked opted-in free accounts and premium mode blocks them', async st => {
    await reset();
    await user({ premium: { planId: 'free', status: 'inactive', telegramAlertsEnabled: true } });
    const requests = provider(st);
    st.mock.method(SiteSettings, 'findById', () => ({ lean: async () => ({ billingEnabled: true }) }));
    await queueJobAlertsForJobs([await job()]);
    assert.equal(requests.length, 0);
    st.mock.method(SiteSettings, 'findById', () => ({ lean: async () => ({ billingEnabled: false }) }));
    await queueJobAlertsForJobs([await job()]);
    assert.equal(requests.length, 1);
    assert.equal(await JobAlertDelivery.countDocuments(), 0);
  });

  await t.test('long job descriptions produce deliverable alerts without disabling the subscriber', async st => {
    await reset(); const owner = await user();
    const jobs = await Promise.all(Array.from({ length: 5 }, () => job({ description: 'Build and maintain web applications. '.repeat(80) })));
    const requests = provider(st, payload => payload.text.length > 4096
      ? { ok: false, error_code: 400, description: 'Bad Request: message is too long' }
      : { ok: true, result: { message_id: 123 } });
    await queueJobAlertsForJobs(jobs);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].text.length <= 4096, `Message has ${requests[0].text.length} characters; Telegram accepts at most 4096.`);
    for (const item of jobs) { assert.ok(requests[0].text.includes(item.title)); assert.ok(requests[0].text.includes(item.sourceUrl)); }
    assert.equal((await User.findById(owner._id)).premium.telegramAlertsEnabled, true);
    assert.equal(await JobAlertDelivery.countDocuments(), 0);
    assert.ok((await Subscription.findOne({ user: owner._id })).telegramLastSentAt);
  });

  await t.test('a payload rejection keeps alerts enabled and a later retry can succeed', async st => {
    await reset(); const owner = await user(); const listing = await job(); let reject = true;
    const requests = provider(st, () => reject
      ? { ok: false, error_code: 400, description: 'Bad Request: message is too long' }
      : { ok: true, result: { message_id: 124 } });
    await queueJobAlertsForJobs([listing]);
    assert.equal((await User.findById(owner._id)).premium.telegramAlertsEnabled, true, 'A malformed message is not an account opt-out.');
    const pending = await JobAlertDelivery.findOne({ user: owner._id });
    assert.equal(pending.status, 'queued'); assert.ok(pending.retryAt > new Date());
    reject = false;
    await JobAlertDelivery.updateOne({ _id: pending._id }, { $set: { retryAt: new Date(0) } });
    await recoverQueuedJobAlerts();
    assert.equal(requests.length, 2); assert.equal(await JobAlertDelivery.countDocuments(), 0);
  });

  await t.test('Telegram flood-control delay is honored without disabling alerts', async st => {
    await reset(); const owner = await user(); const listing = await job(); const before = Date.now();
    const requests = provider(st, () => ({ ok: false, error_code: 429, description: 'Too Many Requests: retry after 180', parameters: { retry_after: 180 } }));
    await queueJobAlertsForJobs([listing]);
    const pending = await JobAlertDelivery.findOne({ user: owner._id });
    assert.ok(pending.retryAt.getTime() >= before + 180000, 'Recovery must not retry before Telegram permits it.');
    assert.equal((await User.findById(owner._id)).premium.telegramAlertsEnabled, true);
    await recoverQueuedJobAlerts(); assert.equal(requests.length, 1);
  });

  await t.test('an eligible linked admin does not need a paid subscription to receive alerts', async st => {
    await reset(); await user({ role: 'admin', premium: { planId: 'free', status: 'inactive', telegramAlertsEnabled: true } });
    const requests = provider(st);
    await queueJobAlertsForJobs([await job()]);
    assert.equal(requests.length, 1, 'Admin entitlement must match the settings API and delivery checks.');
  });

  for (const [status, description] of [[403, 'Forbidden: bot was blocked by the user'], [400, 'Bad Request: chat not found']]) {
    await t.test(`a confirmed unavailable chat (${status}) disables further delivery`, async st => {
      await reset(); const owner = await user(); const requests = provider(st, () => ({ ok: false, error_code: status, description }));
      await queueJobAlertsForJobs([await job()]);
      assert.equal((await User.findById(owner._id)).premium.telegramAlertsEnabled, false);
      assert.equal((await JobAlertDelivery.findOne()).reason, 'telegram_chat_unavailable');
      await recoverQueuedJobAlerts(); assert.equal(requests.length, 1);
    });
  }

  await t.test('paused and scheduled alerts wait, then recovery delivers due work', async st => {
    await reset(); const owner = await user(); const requests = provider(st);
    await updateAlertSchedule(owner._id, { frequency: 'daily', isActive: false, deliveryTime: '09:00', weeklyDay: 'Monday' });
    await queueJobAlertsForJobs([await job()]);
    await recoverQueuedJobAlerts(); assert.equal(requests.length, 0);
    await updateAlertSchedule(owner._id, { frequency: 'daily', isActive: true, deliveryTime: '09:00', weeklyDay: 'Monday' });
    await recoverQueuedJobAlerts(); assert.equal(requests.length, 0);
    await JobAlertDelivery.updateMany({}, { $set: { scheduledFor: new Date(0) } });
    await recoverQueuedJobAlerts(); assert.equal(requests.length, 1);
  });

  await t.test('recovery respects an account deactivated after its delivery was queued', async st => {
    await reset(); const owner = await user(); const requests = provider(st);
    await updateAlertSchedule(owner._id, { frequency: 'daily', isActive: true, deliveryTime: '09:00', weeklyDay: 'Monday' });
    await queueJobAlertsForJobs([await job()]);
    await User.updateOne({ _id: owner._id }, { $set: { deactivated: true } });
    await JobAlertDelivery.updateMany({}, { $set: { scheduledFor: new Date(0) } });
    await recoverQueuedJobAlerts(); assert.equal(requests.length, 0);
  });
});

test('bounded alert text preserves complete navigation links and valid Unicode', t => {
  const previousOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = 'https://jobs.example.test';
  t.after(() => { if (previousOrigin === undefined) delete process.env.FRONTEND_ORIGIN; else process.env.FRONTEND_ORIGIN = previousOrigin; });
  const jobs = Array.from({ length: 5 }, (_,i) => ({ _id: `job-${i}`, title: 'Developer '.repeat(100), company: 'Example '.repeat(100),
    location: 'Bengaluru '.repeat(100), description: '\u{1F600}'.repeat(8000), sourceUrl: `https://employer.example.test/jobs/${i}?source=${'a'.repeat(8000)}` }));
  const body = buildTelegramMessageBody(jobs);
  assert.ok(body.length <= 4096);
  assert.equal(body.isWellFormed(), true);
  for (const item of jobs) assert.ok(body.includes(`https://jobs.example.test/jobs/${item._id}`), 'Long employer URLs need a complete JobVerify link.');
});
