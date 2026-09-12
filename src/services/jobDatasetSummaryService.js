import mongoose from "mongoose";
import Job from "../models/Job.js";
import JobDatasetSummary from "../models/JobDatasetSummary.js";
import { applyPublicJobLocationScope } from "../utils/publicJobLocationScope.js";

export const JOB_DATASET_SUMMARY_KEY = "public-active";
export const JOB_DATASET_LIFECYCLE_VERSION = 3;
const NATIVE_SUMMARY_FIND_ONE = JobDatasetSummary.findOne;

const asSortedUniqueStrings = (values = []) => [...new Set(
  values
    .map((value) => String(value || "").trim())
    .filter(Boolean),
)].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));

export const refreshJobDatasetSummary = async () => {
  const [aggregate] = await Job.aggregate([
    { $match: applyPublicJobLocationScope({ status: "active" }) },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        companies: { $addToSet: "$company" },
        cities: { $addToSet: "$city" },
        jobTypes: { $addToSet: "$jobType" },
      },
    },
  ]).exec();

  const companies = asSortedUniqueStrings(aggregate?.companies);
  const cities = asSortedUniqueStrings(aggregate?.cities);
  const jobTypes = asSortedUniqueStrings(aggregate?.jobTypes);
  const summary = {
    key: JOB_DATASET_SUMMARY_KEY,
    lifecycleVersion: JOB_DATASET_LIFECYCLE_VERSION,
    totalJobs: Number(aggregate?.totalJobs ?? 0),
    totalCompanies: companies.length,
    companies,
    cities,
    jobTypes,
    refreshedAt: new Date(),
  };

  const document = await JobDatasetSummary.findOneAndUpdate(
    { key: JOB_DATASET_SUMMARY_KEY },
    { $set: summary },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .exec();

  return document ?? summary;
};

export const readJobDatasetSummary = async () => (
  mongoose.connection.readyState !== 1 && JobDatasetSummary.findOne === NATIVE_SUMMARY_FIND_ONE
    ? null
    : JobDatasetSummary.findOne({ key: JOB_DATASET_SUMMARY_KEY })
      .lean()
      .exec()
);
