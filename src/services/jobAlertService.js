/**
 * @file Matching, queueing, and delivery helpers for WhatsApp job alerts.
 * @module services/jobAlertService
 */

import User from "../models/User.js";
import JobAlertDelivery from "../models/JobAlertDelivery.js";
import { ACCESS_ROLES } from "../constants/accessPlans.js";
import { canUseWhatsappAlerts } from "../utils/accessControl.js";
import { getPreferredJobTypeMatches } from "../constants/preferredJobTypes.js";
import {
  getWhatsappProvider,
  isWhatsappDeliveryEnabled,
} from "./whatsappProvider.js";

const DEFAULT_COUNTRY_CODE = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "IN")
  .trim()
  .toUpperCase();
const MAX_JOBS_PER_MESSAGE = 5;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toLowerText = (value) => String(value || "").trim().toLowerCase();

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

const buildWhatsappMessageBody = (jobs) => {
  const lines = jobs.slice(0, MAX_JOBS_PER_MESSAGE).map((job, index) =>
    `${index + 1}. ${job.title} at ${job.company} (${job.city || job.location || "India"})`);
  return [
    "New Jobify matches for your profile:",
    ...lines,
  ].join("\n");
};

const sendWhatsappAlertBatch = async (user, jobs) => {
  const provider = getWhatsappProvider();
  const to = normalizePhoneE164(user.contact?.phoneE164);
  const body = buildWhatsappMessageBody(jobs);

  return provider.sendTemplateMessage({ to, body });
};

const markDeliveries = async (deliveries, update) => {
  if (!deliveries.length) return;
  await JobAlertDelivery.updateMany(
    { _id: { $in: deliveries.map((delivery) => delivery._id) } },
    { $set: update },
  );
};

const createQueuedDeliveries = async (user, jobs) => {
  const created = [];

  for (const job of jobs.slice(0, MAX_JOBS_PER_MESSAGE)) {
    try {
      const delivery = await JobAlertDelivery.create({
        user: user._id,
        job: job._id,
        channel: "whatsapp",
        status: "queued",
      });
      created.push(delivery);
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  return created;
};

const processAlertsForUser = async (user, jobs) => {
  if (!canUseWhatsappAlerts(user) || !hasWhatsappOptIn(user)) {
    return;
  }

  const matchingJobs = jobs.filter((job) => jobMatchesUserPreferences(user, job));
  if (matchingJobs.length === 0) {
    return;
  }

  const queuedDeliveries = await createQueuedDeliveries(user, matchingJobs);
  if (queuedDeliveries.length === 0) {
    return;
  }

  if (!isWhatsappDeliveryEnabled() && getWhatsappProvider().name !== "mock") {
    await markDeliveries(queuedDeliveries, {
      status: "skipped",
      reason: "whatsapp_disabled",
    });
    return;
  }

  try {
    const result = await sendWhatsappAlertBatch(user, matchingJobs);
    await markDeliveries(queuedDeliveries, {
      status: "sent",
      sentAt: new Date(),
      providerMessageId: result.providerMessageId,
      reason: null,
    });
  } catch (error) {
    await markDeliveries(queuedDeliveries, {
      status: "failed",
      reason: error.message,
    });
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
    "premium.whatsappAlertsEnabled": true,
  }).lean().exec();

  await Promise.all(
    users.map((user) => processAlertsForUser(user, jobs)),
  );
};

export const enqueueJobAlertsForJobs = (jobs = []) => {
  setImmediate(() => {
    queueJobAlertsForJobs(jobs).catch((error) => {
      console.error("[Job Alerts] Failed to process queued alerts:", error.message);
    });
  });
};
