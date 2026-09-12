/**
 * @file Telegram-only matching, queueing, and delivery for job alerts.
 */

import { randomUUID } from "node:crypto";
import User from "../models/User.js";
import JobAlertDelivery from "../models/JobAlertDelivery.js";
import { canUseTelegramAlerts } from "../utils/accessControl.js";
import { isAggregateHiringSignalJob } from "../utils/jobListingEvidence.js";
import { hasSavedFilters, jobMatchesSavedFilters } from "./jobFilterMatcher.js";
import { normalizeProfilePreferenceFilters } from "../utils/profilePreferenceFilters.js";
import { alertScheduleService } from "./alertScheduleService.js";
import { getTelegramProvider, isTelegramDeliveryEnabled } from "./telegramProvider.js";

const MAX_JOBS_PER_MESSAGE = 5;
const CLAIM_TTL_MS = 5 * 60 * 1000;
const SEND_TIMEOUT_MS = 60 * 1000;
const RECOVERY_LIMIT = 500;

export const buildTelegramMessageBody = (jobs) => jobs
  .slice(0, MAX_JOBS_PER_MESSAGE)
  .map((job, index) => [
    `${index + 1}. ${job.title}`,
    `${job.company} - ${job.city || job.location || "India"}`,
    job.summary || job.description,
    job.jobUrl || job.applyUrl || job.sourceUrl || job.link,
  ].filter(Boolean).join("\n"))
  .join("\n\n");

const claimFilter = (now = new Date()) => ({
  channel: "telegram",
  schedulePaused: { $ne: true },
  $and: [
    { $or: [{ scheduledFor: null }, { scheduledFor: { $lte: now } }] },
    { $or: [{ retryAt: null }, { retryAt: { $lte: now } }] },
  ],
  $or: [
    { status: "queued", lastAttemptAt: null },
    { status: "queued", retryAt: { $lte: now } },
    { status: "failed" },
    { status: "processing", claimExpiresAt: { $lte: now } },
  ],
});

const mark = (deliveries, update) => deliveries.length
  ? JobAlertDelivery.updateMany({ _id: { $in: deliveries.map(({ _id }) => _id) }, ...claimFilter() }, { $set: update })
  : Promise.resolve();

const cleanupSentDeliveries = async (ids) => {
  try {
    await JobAlertDelivery.deleteMany({ channel: "telegram", status: "sent",
      ...(ids ? { _id: { $in: ids } } : {}) });
  } catch (error) {
    console.error("[Telegram Alerts] Sent delivery cleanup will retry:", error.message);
  }
};

const retryUpdate = (reason, delayMs) => ({
  status: "queued", reason, lastAttemptAt: new Date(), retryAt: new Date(Date.now() + delayMs),
  claimToken: null, claimExpiresAt: null,
});

const sendWithTimeout = async (provider, payload) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  timeout.unref?.();
  try {
    return await provider.sendTextMessage({ ...payload, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const processRecords = async (user, records) => {
  for (let offset = 0; offset < records.length; offset += MAX_JOBS_PER_MESSAGE) {
    const batch = records.slice(offset, offset + MAX_JOBS_PER_MESSAGE);
    const now = new Date();
    const token = randomUUID();
    let claimed = [];
    for (const { delivery, job } of batch) {
      const claimedDelivery = await JobAlertDelivery.findOneAndUpdate(
        { _id: delivery._id, ...claimFilter(now) },
        { $set: { status: "processing", claimToken: token, claimExpiresAt: new Date(now.getTime() + CLAIM_TTL_MS), reason: null } },
        { new: true, lean: true },
      );
      if (claimedDelivery) claimed.push({ delivery: claimedDelivery, job });
    }
    if (!claimed.length) continue;

    const owned = { _id: { $in: claimed.map(({ delivery }) => delivery._id) }, status: "processing", claimToken: token };

    // Each provider message uses current account, filter and job data. Recovery
    // can span many batches, and a user may disable or disconnect in between.
    const current = await JobAlertDelivery.find(owned).populate("user").populate("job").lean().exec();
    const currentUser = current.find((delivery) => delivery.user)?.user;
    if (!currentUser) {
      await JobAlertDelivery.updateMany(owned, { $set: { status: "skipped", reason: "missing_delivery_context", claimToken: null, claimExpiresAt: null } });
      continue;
    }
    if (!canUseTelegramAlerts(currentUser)) {
      await JobAlertDelivery.updateMany(owned, { $set: retryUpdate("user_ineligible", 60 * 60_000) });
      continue;
    }
    const filters = normalizeProfilePreferenceFilters(currentUser.profile?.telegramAlertFilters);
    const matching = current.filter(({ job }) => job && hasSavedFilters(filters)
      && !isAggregateHiringSignalJob(job) && (!job.status || job.status === "active")
      && jobMatchesSavedFilters({ job, filters, userProfile: currentUser.profile }));
    const matchingIds = new Set(matching.map(({ _id }) => String(_id)));
    const staleIds = claimed.map(({ delivery }) => delivery._id).filter((id) => !matchingIds.has(String(id)));
    if (staleIds.length) await JobAlertDelivery.updateMany({ ...owned, _id: { $in: staleIds } }, { $set: {
      status: "skipped", reason: hasSavedFilters(filters) ? "filters_no_longer_match" : "filters_cleared",
      claimToken: null, claimExpiresAt: null,
    } });
    claimed = matching.map((delivery) => ({ delivery, job: delivery.job }));
    if (!claimed.length) continue;

    const schedule = await alertScheduleService.getSchedule(user._id);
    if (!schedule.isActive || claimed.some(({ delivery }) => (delivery.scheduleVersion ?? 0) !== schedule.version)) {
      await alertScheduleService.requeueClaimed(user._id, claimed.map(({ delivery }) => delivery._id), token, new Date());
      continue;
    }
    if (!isTelegramDeliveryEnabled()) {
      await JobAlertDelivery.updateMany(owned, { $set: retryUpdate("telegram_disabled", 5 * 60_000) });
      continue;
    }
    const body = buildTelegramMessageBody(claimed.map(({ job }) => job));
    const attemptCount = Math.max(0, ...claimed.map(({ delivery }) => delivery.attemptCount || 0)) + 1;
    let result;
    try {
      result = await sendWithTimeout(getTelegramProvider(), { chatId: currentUser.telegram.chatId, body });
    } catch (error) {
      const unavailable = [400, 403].includes(error?.statusCode);
      if (unavailable) await User.updateOne({ _id: user._id }, { $set: { "premium.telegramAlertsEnabled": false } });
      const delayMs = unavailable ? 60 * 60_000 : Math.min(60 * 60_000, 60_000 * (2 ** Math.min(attemptCount - 1, 6)));
      await JobAlertDelivery.updateMany(owned, { $set: {
        ...retryUpdate(unavailable ? "telegram_chat_unavailable" : error.message, delayMs),
        attemptCount, providerName: "telegram", payloadPreview: body.slice(0, 500),
      } });
      continue;
    }

    // Record the acknowledgement before deleting. Storage/cleanup failures must
    // never be caught as provider failures and turn sent rows into retries.
    const sentAt = new Date();
    await JobAlertDelivery.updateMany(owned, { $set: {
      status: "sent", sentAt, lastAttemptAt: sentAt, retryAt: null, attemptCount,
      providerName: result.providerName, providerMessageId: result.providerMessageId,
      payloadPreview: null, reason: null, claimToken: null, claimExpiresAt: null,
    } });
    await alertScheduleService.markSent(user._id, sentAt).catch((error) => {
      console.error("[Telegram Alerts] Could not update last send time:", error.message);
    });
    await cleanupSentDeliveries(claimed.map(({ delivery }) => delivery._id));
  }
};

export const queueJobAlertsForJobs = async (jobs = []) => {
  if (!Array.isArray(jobs) || !jobs.length) return;
  const users = await User.find({ deactivated: false, "premium.status": "active", "premium.telegramAlertsEnabled": true }).lean().exec();
  await Promise.all(users.map(async (user) => {
    if (!canUseTelegramAlerts(user)) return;
    const filters = normalizeProfilePreferenceFilters(user.profile?.telegramAlertFilters);
    if (!hasSavedFilters(filters)) return;
    const matching = jobs.filter((job) => !isAggregateHiringSignalJob(job)
      && jobMatchesSavedFilters({ job, filters, userProfile: user.profile }));
    if (!matching.length) return;
    const queued = await alertScheduleService.queueDeliveries(user, matching, "telegram");
    await processRecords(user, queued);
  }));
};

let recoveryInProgress = false;
export const recoverQueuedJobAlerts = async () => {
  if (recoveryInProgress) return;
  recoveryInProgress = true;
  try {
    await cleanupSentDeliveries();
    const deliveries = await JobAlertDelivery.find(claimFilter()).sort({ createdAt: 1, _id: 1 }).limit(RECOVERY_LIMIT).populate("user").populate("job").lean().exec();
    const grouped = new Map();
    for (const delivery of deliveries) {
      if (!delivery.user || !delivery.job) {
        await mark([delivery], { status: "skipped", reason: "missing_delivery_context" });
        continue;
      }
      const key = String(delivery.user._id);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ delivery, job: delivery.job });
    }
    for (const records of grouped.values()) await processRecords(records[0].delivery.user, records);
  } finally {
    recoveryInProgress = false;
  }
};

export const enqueueJobAlertsForJobs = (jobs = []) => setImmediate(() => {
  queueJobAlertsForJobs(jobs).catch((error) => console.error("[Telegram Alerts] Failed to process alerts:", error.message));
});

export const jobAlertService = { enqueueJobAlertsForJobs };
