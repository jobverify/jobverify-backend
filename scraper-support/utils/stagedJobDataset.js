import mongoose from "mongoose";

import Job from "../../src/models/Job.js";
import StagedJob from "../../src/models/StagedJob.js";
import { jobAlertService } from "../../src/services/jobAlertService.js";
import { refreshJobDatasetSummary } from "../../src/services/jobDatasetSummaryService.js";

export const STAGED_JOB_COLLECTION_NAME = "jobs_staging";

const hasLiveDatabaseHandle = () => (
  mongoose.connection.readyState === 1
  && mongoose.connection.db != null
);

const ensureConnected = async () => {
  if (hasLiveDatabaseHandle()) return;

  if (mongoose.connection.readyState === 0) {
    const { default: connectDB } = await import("../../db/db.js");
    await connectDB();
    return;
  }

  throw new Error("MongoDB connection handle is unavailable.");
};

export const shouldUseStagedJobDatasetRun = ({
  dryRun = false,
  onlySources = process.env.SCRAPER_ONLY,
  startAt = process.env.SCRAPER_START_AT,
  startAfter = process.env.SCRAPER_START_AFTER,
} = {}) => {
  if (dryRun) return false;

  return !String(onlySources || "").trim()
    && !String(startAt || "").trim()
    && !String(startAfter || "").trim();
};

const hasAuthoritativeReplacement = (result = {}) => (
  result?.success === true
  && result?.skipped !== true
  && result?.staleCheckSkipped !== true
);

export const resolveSourcesToCarryForward = ({
  selectedSources = [],
  summary = {},
} = {}) => selectedSources.filter((source) => !hasAuthoritativeReplacement(summary[source]));

export const prepareStagedJobDatasetRun = async () => {
  await ensureConnected();
  await StagedJob.init();
  await StagedJob.deleteMany({});

  return {
    collectionName: STAGED_JOB_COLLECTION_NAME,
    jobModel: StagedJob,
  };
};

const stripDocumentIdentity = (document = {}) => {
  const { _id, id, ...rest } = document;
  return rest;
};

const copyLiveJobsForSourcesToCarryForward = async (sources = []) => {
  if (!Array.isArray(sources) || sources.length === 0) return 0;

  const existingJobs = await Job.find({
    source: { $in: sources },
  })
    .lean()
    .exec();

  if (existingJobs.length === 0) return 0;

  await StagedJob.insertMany(existingJobs.map(stripDocumentIdentity), {
    ordered: false,
  });

  return existingJobs.length;
};

export const clearStagedJobDatasetRun = async () => {
  await ensureConnected();
  await StagedJob.deleteMany({});
};

export const promoteStagedJobDataset = async ({
  selectedSources = [],
  summary = {},
  refreshSummary = true,
} = {}) => {
  await ensureConnected();

  const carriedForwardSources = resolveSourcesToCarryForward({
    selectedSources,
    summary,
  });
  const oldFingerprints = new Set(await Job.distinct("fingerprint"));
  const carriedForwardJobs = await copyLiveJobsForSourcesToCarryForward(carriedForwardSources);
  const promotedFingerprints = await StagedJob.distinct("fingerprint");
  const trulyNewFingerprints = promotedFingerprints.filter((fingerprint) => !oldFingerprints.has(fingerprint));

  await StagedJob.collection.rename(Job.collection.collectionName, {
    dropTarget: true,
  });

  if (refreshSummary) {
    await refreshJobDatasetSummary();
  }

  if (trulyNewFingerprints.length > 0) {
    const insertedJobs = await Job.find({
      fingerprint: { $in: trulyNewFingerprints },
      status: "active",
    })
      .lean()
      .exec();

    jobAlertService.enqueueJobAlertsForJobs(insertedJobs);
  }

  return {
    carriedForwardSources,
    carriedForwardJobs,
    totalPromotedJobs: promotedFingerprints.length,
    alertedJobs: trulyNewFingerprints.length,
  };
};
