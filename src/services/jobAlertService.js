/**
 * @file Matching, queueing, and delivery helpers for WhatsApp job alerts.
 * @module services/jobAlertService
 */

import { randomUUID } from "node:crypto";

import User from "../models/User.js";
import JobAlertDelivery from "../models/JobAlertDelivery.js";
import { ACCESS_ROLES } from "../constants/accessPlans.js";
import { canUseTelegramAlerts, canUseWhatsappAlerts } from "../utils/accessControl.js";
import { getPreferredJobTypeMatches } from "../constants/preferredJobTypes.js";
import {
  hasSavedFilters,
  jobMatchesSavedFilters,
} from "./jobFilterMatcher.js";
import { normalizeProfilePreferenceFilters } from "../utils/profilePreferenceFilters.js";
import {
  getWhatsappProvider,
  isWhatsappDeliveryEnabled,
} from "./whatsappProvider.js";
import {
  getTelegramProvider,
  isTelegramDeliveryEnabled,
} from "./telegramProvider.js";

const DEFAULT_COUNTRY_CODE = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "IN")
  .trim()
  .toUpperCase();
const MAX_JOBS_PER_MESSAGE = 5;
const QUEUED_DELIVERY_RECOVERY_LIMIT = 500;
const DEFAULT_DELIVERY_CLAIM_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SEND_TIMEOUT_MS = 60 * 1000;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const getNonNegativeInteger = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!/^\d+$/u.test(normalized)) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : 0;
};

const getWhatsappRetrySettings = () => ({
  retryCount: getNonNegativeInteger(process.env.WHATSAPP_RETRY_COUNT, 2),
  retryDelayMs: getNonNegativeInteger(process.env.WHATSAPP_RETRY_DELAY_MS, 750),
});

const getTelegramRetrySettings = () => ({
  retryCount: getNonNegativeInteger(process.env.TELEGRAM_RETRY_COUNT, 2),
  retryDelayMs: getNonNegativeInteger(process.env.TELEGRAM_RETRY_DELAY_MS, 750),
});

const getPositiveInteger = (value, fallback) => {
  const normalized = getNonNegativeInteger(value, fallback);
  return normalized > 0 ? normalized : fallback;
};

const getWhatsappDeliveryTimingSettings = (retrySettings = getWhatsappRetrySettings()) => {
  const requestedClaimTtlMs = getPositiveInteger(
    process.env.WHATSAPP_CLAIM_TTL_MS,
    DEFAULT_DELIVERY_CLAIM_TTL_MS,
  );
  const requestedTimeoutMs = getPositiveInteger(
    process.env.WHATSAPP_SEND_TIMEOUT_MS,
    DEFAULT_SEND_TIMEOUT_MS,
  );
  const retryCount = retrySettings.retryCount;
  const retryDelayMs = retrySettings.retryDelayMs;
  const minimumClaimTtlMs = ((retryCount + 1) * requestedTimeoutMs)
    + (retryCount * retryDelayMs)
    + 1000;
  const claimTtlMs = Math.max(2, requestedClaimTtlMs, minimumClaimTtlMs);

  return {
    claimTtlMs,
    sendTimeoutMs: requestedTimeoutMs,
  };
};

const getTelegramDeliveryTimingSettings = (retrySettings = getTelegramRetrySettings()) => {
  const requestedClaimTtlMs = getPositiveInteger(
    process.env.TELEGRAM_CLAIM_TTL_MS,
    DEFAULT_DELIVERY_CLAIM_TTL_MS,
  );
  const requestedTimeoutMs = getPositiveInteger(
    process.env.TELEGRAM_SEND_TIMEOUT_MS,
    DEFAULT_SEND_TIMEOUT_MS,
  );
  const { retryCount, retryDelayMs } = retrySettings;
  const minimumClaimTtlMs = ((retryCount + 1) * requestedTimeoutMs)
    + (retryCount * retryDelayMs)
    + 1000;

  return {
    claimTtlMs: Math.max(2, requestedClaimTtlMs, minimumClaimTtlMs),
    sendTimeoutMs: requestedTimeoutMs,
  };
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toLowerText = (value) => String(value || "").trim().toLowerCase();

const isLegacyQueueReclaimEnabled = () =>
  TRUE_VALUES.has(
    String(process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM || "false")
      .trim()
      .toLowerCase(),
  );

export const normalizePhoneE164 = (value, defaultCountry = DEFAULT_COUNTRY_CODE) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && /^\+\d{8,15}$/.test(digits)) {
    return digits;
  }

  const numeric = digits.replace(/\D/g, "");
  if (defaultCountry === "IN" && /^\d{10}$/.test(numeric)) {
    return `+91${numeric}`;
  }

  return null;
};

const hasWhatsappOptIn = (user) =>
  Boolean(
    normalizePhoneE164(user?.contact?.phoneE164)
    && user?.contact?.whatsappOptInAt
    && (
      !user?.contact?.whatsappOptOutAt
      || new Date(user.contact.whatsappOptInAt).getTime()
        > new Date(user.contact.whatsappOptOutAt).getTime()
    ),
  );

const normalizeJobTypes = (jobTypes = []) =>
  [...new Set(jobTypes.flatMap((jobType) => getPreferredJobTypeMatches(jobType)))].map((item) =>
    item.toLowerCase());

export const jobMatchesUserPreferences = (user, job) => {
  const profile = user?.profile || {};
  const preferredJobTypes = normalizeJobTypes(profile.preferredJobTypes || []);
  const preferredLocations = (profile.locationPreference || []).map((value) => value.toLowerCase());
  const branch = toLowerText(profile.branch);
  const passingYear = Number(profile.passingYear);

  const jobBranches = (job?.branches || []).map((value) => toLowerText(value));
  const jobBatches = (job?.eligibleBatches || []).map((value) => Number(value));
  const jobType = toLowerText(job?.jobType);
  const jobCity = toLowerText(job?.city);
  const jobLocation = toLowerText(job?.location);
  const textBlob = [
    job?.title,
    job?.description,
    ...(job?.requiredSkills || []),
  ]
    .map((value) => toLowerText(value))
    .join(" ");

  const batchEligible = jobBatches.length === 0 || jobBatches.includes(passingYear);
  const branchEligible = jobBranches.length === 0 || jobBranches.includes(branch);
  if (!batchEligible || !branchEligible) {
    return false;
  }

  const jobTypeMatch = preferredJobTypes.length > 0
    && preferredJobTypes.includes(jobType);
  const locationMatch = preferredLocations.length > 0
    && preferredLocations.some((location) =>
      location === jobCity || location === jobLocation || jobLocation.includes(location));
  const keywordMatch = preferredJobTypes.some((term) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, "i").test(textBlob));

  return jobTypeMatch || locationMatch || keywordMatch;
};

export const buildWhatsappMessageBody = (jobs) => jobs
  .slice(0, MAX_JOBS_PER_MESSAGE)
  .map((job, index) => [
    `${index + 1}. ${job.title}`,
    `${job.company} - ${job.city || job.location || "India"}`,
    job.summary || job.description,
    job.jobUrl || job.applyUrl || job.sourceUrl || job.link,
  ].filter(Boolean).join("\n"))
  .join("\n\n");

const sendTextMessageWithTimeout = async (provider, payload, timeoutMs) => {
  if (!(timeoutMs > 0)) {
    return provider.sendTextMessage(payload);
  }

  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  timeoutId.unref?.();

  try {
    return await provider.sendTextMessage({
      ...payload,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout) {
      throw Object.assign(
        new Error(`WhatsApp provider timed out after ${timeoutMs}ms.`),
        { timedOut: true },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const sendWhatsappAlertBatch = async (provider, user, jobs) => {
  const to = normalizePhoneE164(user.contact?.phoneE164);
  const body = buildWhatsappMessageBody(jobs);
  const { retryCount, retryDelayMs } = getWhatsappRetrySettings();
  const { sendTimeoutMs } = getWhatsappDeliveryTimingSettings({
    retryCount,
    retryDelayMs,
  });

  let attemptCount = 0;
  let lastError;

  while (attemptCount <= retryCount) {
    attemptCount += 1;
    try {
      const result = await sendTextMessageWithTimeout(
        provider,
        { to, body },
        sendTimeoutMs,
      );
      return { result, attemptCount, body };
    } catch (error) {
      lastError = error;
      if (error?.timedOut) {
        throw Object.assign(lastError, { attemptCount, body });
      }
      if (attemptCount <= retryCount && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw Object.assign(lastError, { attemptCount, body });
};

const sendTelegramAlertBatch = async (provider, user, jobs) => {
  const chatId = user.telegram?.chatId;
  const body = buildWhatsappMessageBody(jobs);
  const { retryCount, retryDelayMs } = getTelegramRetrySettings();
  const { sendTimeoutMs } = getTelegramDeliveryTimingSettings({
    retryCount,
    retryDelayMs,
  });

  let attemptCount = 0;
  let lastError;

  while (attemptCount <= retryCount) {
    attemptCount += 1;
    try {
      const result = await sendTextMessageWithTimeout(
        provider,
        { chatId, body },
        sendTimeoutMs,
      );
      return { result, attemptCount, body };
    } catch (error) {
      lastError = error;
      if (error?.timedOut || [400, 403].includes(error?.statusCode)) {
        throw Object.assign(lastError, { attemptCount, body });
      }
      if (attemptCount <= retryCount && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw Object.assign(lastError, { attemptCount, body });
};

const markDeliveries = async (deliveries, update) => {
  if (!deliveries.length) return;
  await JobAlertDelivery.updateMany(
    { _id: { $in: deliveries.map((delivery) => delivery._id) } },
    { $set: update },
  );
};

const buildClaimableDeliveryFilter = (channel = "whatsapp", claimedAt = new Date()) => {
  const legacyClaimCutoff = new Date(
    claimedAt.getTime() - DEFAULT_DELIVERY_CLAIM_TTL_MS,
  );
  const queueClauses = [{ status: "queued", lastAttemptAt: null }];

  if (isLegacyQueueReclaimEnabled()) {
    queueClauses.push({
      status: "queued",
      lastAttemptAt: { $lte: legacyClaimCutoff },
    });
  }

  return {
    channel,
    $or: [
      ...queueClauses,
      { status: "processing", claimExpiresAt: { $lte: claimedAt } },
    ],
  };
};

const claimDeliveryRecord = async (delivery, claimToken, claimExpiresAt, claimedAt = new Date()) => {
  const claimedDelivery = await JobAlertDelivery.findOneAndUpdate(
    {
      _id: delivery._id,
      ...buildClaimableDeliveryFilter(delivery.channel || "whatsapp", claimedAt),
    },
    {
      $set: {
        status: "processing",
        claimToken,
        claimExpiresAt,
        reason: null,
      },
    },
    {
      new: true,
      lean: true,
    },
  );

  if (!claimedDelivery) {
    return null;
  }

  return {
    ...delivery,
    ...claimedDelivery,
  };
};

const claimDeliveryBatch = async (deliveryRecords) => {
  const channel = deliveryRecords[0]?.delivery?.channel || "whatsapp";
  const claimTtlMs = (channel === "telegram"
    ? getTelegramDeliveryTimingSettings()
    : getWhatsappDeliveryTimingSettings()).claimTtlMs;
  const claimToken = randomUUID();
  const claimedAt = new Date();
  const claimExpiresAt = new Date(claimedAt.getTime() + claimTtlMs);
  const claimedRecords = [];

  for (const record of deliveryRecords) {
    const claimedDelivery = await claimDeliveryRecord(
      record.delivery,
      claimToken,
      claimExpiresAt,
      claimedAt,
    );
    if (!claimedDelivery) {
      continue;
    }

    claimedRecords.push({
      ...record,
      delivery: claimedDelivery,
    });
  }

  return { claimToken, claimedRecords };
};

const createQueuedDeliveries = async (user, jobs, channel = "whatsapp") => {
  const created = [];

  for (const job of jobs) {
    try {
      const delivery = await JobAlertDelivery.create({
        user: user._id,
        job: job._id,
        channel,
        status: "queued",
        jobSnapshot: {
          title: job.title || null,
          company: job.company || null,
          location: job.city || job.location || null,
          jobUrl: job.jobUrl || job.applyUrl || job.sourceUrl || job.link || null,
        },
      });
      created.push({ delivery, job });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  return created;
};

const markClaimedDeliveries = async (deliveries, claimToken, update) => {
  if (!deliveries.length) return { modifiedCount: 0 };

  return JobAlertDelivery.updateMany(
    {
      _id: { $in: deliveries.map((delivery) => delivery._id) },
      status: "processing",
      claimToken,
    },
    {
      $set: {
        ...update,
        claimToken: null,
        claimExpiresAt: null,
      },
    },
  );
};

const processClaimedDeliveryBatch = async (user, deliveryRecords, claimToken) => {
  const queuedDeliveries = deliveryRecords.map(({ delivery }) => delivery);
  const queuedJobs = deliveryRecords.map(({ job }) => job);
  const channel = queuedDeliveries[0]?.channel || "whatsapp";
  const isTelegram = channel === "telegram";
  const provider = isTelegram ? getTelegramProvider() : getWhatsappProvider();

  if (isTelegram && !isTelegramDeliveryEnabled()) {
    await markClaimedDeliveries(queuedDeliveries, claimToken, {
      status: "skipped",
      reason: "telegram_disabled",
    });
    return;
  }

  if (!isTelegram && !isWhatsappDeliveryEnabled() && provider.name !== "mock") {
    await markClaimedDeliveries(queuedDeliveries, claimToken, {
      status: "skipped",
      reason: "whatsapp_disabled",
    });
    return;
  }

  try {
    const { result, attemptCount, body } = isTelegram
      ? await sendTelegramAlertBatch(provider, user, queuedJobs)
      : await sendWhatsappAlertBatch(provider, user, queuedJobs);
    const attemptedAt = new Date();
    await markClaimedDeliveries(queuedDeliveries, claimToken, {
      status: "sent",
      sentAt: attemptedAt,
      lastAttemptAt: attemptedAt,
      attemptCount,
      providerName: result.providerName,
      providerMessageId: result.providerMessageId,
      payloadPreview: body.slice(0, 500),
      reason: null,
    });
  } catch (error) {
    const isUnavailableTelegramChat = isTelegram && [400, 403].includes(error?.statusCode);
    if (isUnavailableTelegramChat) {
      await User.updateOne(
        { _id: user._id },
        { $set: { "premium.telegramAlertsEnabled": false } },
      );
    }
    await markClaimedDeliveries(queuedDeliveries, claimToken, {
      status: "failed",
      lastAttemptAt: new Date(),
      attemptCount: error.attemptCount || 1,
      providerName: provider.name,
      payloadPreview: error.body?.slice(0, 500) || null,
      reason: isUnavailableTelegramChat ? "telegram_chat_unavailable" : error.message,
    });
  }
};

const processDeliveryRecords = async (user, deliveryRecords) => {
  for (let index = 0; index < deliveryRecords.length; index += MAX_JOBS_PER_MESSAGE) {
    const { claimToken, claimedRecords } = await claimDeliveryBatch(
      deliveryRecords.slice(index, index + MAX_JOBS_PER_MESSAGE),
    );
    if (!claimedRecords.length) {
      continue;
    }

    await processClaimedDeliveryBatch(user, claimedRecords, claimToken);
  }
};

const processAlertsForUser = async (user, jobs) => {
  if (!canUseWhatsappAlerts(user) || !hasWhatsappOptIn(user)) {
    return;
  }

  const alertFilters = normalizeProfilePreferenceFilters(user.profile?.whatsappAlertFilters);
  if (!hasSavedFilters(alertFilters)) {
    return;
  }

  const matchingJobs = jobs.filter((job) => jobMatchesSavedFilters({
    job,
    filters: alertFilters,
    userProfile: user.profile,
  }));
  if (matchingJobs.length === 0) {
    return;
  }

  const queuedDeliveryRecords = await createQueuedDeliveries(user, matchingJobs);
  if (queuedDeliveryRecords.length === 0) {
    return;
  }
  await processDeliveryRecords(user, queuedDeliveryRecords);
};

const processTelegramAlertsForUser = async (user, jobs) => {
  if (!canUseTelegramAlerts(user)) {
    return;
  }

  const alertFilters = normalizeProfilePreferenceFilters(user.profile?.telegramAlertFilters);
  if (!hasSavedFilters(alertFilters)) {
    return;
  }

  const matchingJobs = jobs.filter((job) => jobMatchesSavedFilters({
    job,
    filters: alertFilters,
    userProfile: user.profile,
  }));
  if (matchingJobs.length === 0) {
    return;
  }

  const queuedDeliveryRecords = await createQueuedDeliveries(user, matchingJobs, "telegram");
  if (!queuedDeliveryRecords.length) {
    return;
  }
  await processDeliveryRecords(user, queuedDeliveryRecords);
};

let recoveryInProgress = false;

const hydrateClaimedDeliveryRecords = async (deliveries, claimToken) => {
  if (!deliveries.length) {
    return [];
  }

  const hydratedDeliveries = await JobAlertDelivery.find({
    _id: { $in: deliveries.map((delivery) => delivery._id) },
    status: "processing",
    claimToken,
  })
    .populate("user")
    .populate("job")
    .lean()
    .exec();

  const deliveriesById = new Map(
    hydratedDeliveries.map((delivery) => [String(delivery._id), delivery]),
  );

  return deliveries.map((delivery) => {
    const hydrated = deliveriesById.get(String(delivery._id));
    if (!hydrated) {
      return null;
    }

    return {
      delivery: hydrated,
      user: hydrated.user,
      job: hydrated.job,
    };
  }).filter(Boolean);
};

const processRecoveredDeliveryBatch = async (candidateRecords) => {
  const { claimToken, claimedRecords } = await claimDeliveryBatch(candidateRecords);
  if (!claimedRecords.length) {
    return;
  }

  const claimedDeliveries = claimedRecords.map(({ delivery }) => delivery);
  const hydratedRecords = await hydrateClaimedDeliveryRecords(claimedDeliveries, claimToken);
  const hydratedIds = new Set(
    hydratedRecords.map(({ delivery }) => String(delivery._id)),
  );

  const missingHydration = claimedDeliveries.filter(
    (delivery) => !hydratedIds.has(String(delivery._id)),
  );
  await markClaimedDeliveries(missingHydration, claimToken, {
    status: "skipped",
    reason: "missing_delivery_context",
  });

  const missingContext = hydratedRecords.filter(
    ({ user, job }) => !user || !job,
  );
  await markClaimedDeliveries(missingContext.map(({ delivery }) => delivery), claimToken, {
    status: "skipped",
    reason: "missing_delivery_context",
  });

  const readyRecords = hydratedRecords.filter(
    ({ user, job }) => Boolean(user && job),
  );
  if (!readyRecords.length) {
    return;
  }

  const currentUser = readyRecords[0].user;
  const channel = readyRecords[0].delivery.channel || "whatsapp";
  const eligible = channel === "telegram"
    ? canUseTelegramAlerts(currentUser)
    : canUseWhatsappAlerts(currentUser) && hasWhatsappOptIn(currentUser);
  if (!eligible) {
    await markClaimedDeliveries(readyRecords.map(({ delivery }) => delivery), claimToken, {
      status: "skipped",
      reason: "user_ineligible",
    });
    return;
  }

  const alertFilters = normalizeProfilePreferenceFilters(channel === "telegram"
    ? currentUser.profile?.telegramAlertFilters
    : currentUser.profile?.whatsappAlertFilters);
  if (!hasSavedFilters(alertFilters)) {
    await markClaimedDeliveries(readyRecords.map(({ delivery }) => delivery), claimToken, {
      status: "skipped",
      reason: "filters_cleared",
    });
    return;
  }

  const matchingRecords = [];
  const staleRecords = [];

  for (const record of readyRecords) {
    if (jobMatchesSavedFilters({
      job: record.job,
      filters: alertFilters,
      userProfile: currentUser.profile,
    })) {
      matchingRecords.push({
        delivery: record.delivery,
        job: record.job,
      });
    } else {
      staleRecords.push(record.delivery);
    }
  }

  await markClaimedDeliveries(staleRecords, claimToken, {
    status: "skipped",
    reason: "filters_no_longer_match",
  });

  if (!matchingRecords.length) {
    return;
  }

  await processClaimedDeliveryBatch(currentUser, matchingRecords, claimToken);
};

export const recoverQueuedJobAlerts = async () => {
  if (recoveryInProgress) return;
  recoveryInProgress = true;

  try {
    const queued = await JobAlertDelivery.find({
      channel: { $in: ["whatsapp", "telegram"] },
      $or: buildClaimableDeliveryFilter("whatsapp").$or,
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(QUEUED_DELIVERY_RECOVERY_LIMIT)
      .lean()
      .exec();

    const groupedByUser = new Map();

    for (const delivery of queued) {
      if (!delivery.user || !delivery.job) {
        await markDeliveries([delivery], {
          status: "skipped",
          reason: "missing_delivery_context",
          claimToken: null,
          claimExpiresAt: null,
        });
        continue;
      }

      const userId = `${String(delivery.user)}:${delivery.channel || "whatsapp"}`;
      if (!groupedByUser.has(userId)) {
        groupedByUser.set(userId, []);
      }
      groupedByUser.get(userId).push({ delivery });
    }

    for (const records of groupedByUser.values()) {
      for (let index = 0; index < records.length; index += MAX_JOBS_PER_MESSAGE) {
        await processRecoveredDeliveryBatch(
          records.slice(index, index + MAX_JOBS_PER_MESSAGE),
        );
      }
    }
  } finally {
    recoveryInProgress = false;
  }
};

export const queueJobAlertsForJobs = async (jobs = []) => {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return;
  }

  const users = await User.find({
    deactivated: false,
    accessRole: {
      $in: [ACCESS_ROLES.SEMESTER, ACCESS_ROLES.YEARLY],
    },
    "premium.status": "active",
    $or: [
      { "premium.whatsappAlertsEnabled": true },
      { "premium.telegramAlertsEnabled": true },
    ],
  }).lean().exec();

  await Promise.all(
    users.map(async (user) => {
      await processAlertsForUser(user, jobs);
      await processTelegramAlertsForUser(user, jobs);
    }),
  );
};

export const enqueueJobAlertsForJobs = (jobs = []) => {
  setImmediate(() => {
    queueJobAlertsForJobs(jobs).catch((error) => {
      console.error("[Job Alerts] Failed to process queued alerts:", error.message);
    });
  });
};

export const jobAlertService = {
  enqueueJobAlertsForJobs: (jobs) => enqueueJobAlertsForJobs(jobs),
};
