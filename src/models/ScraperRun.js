/**
 * @file Schema and indexes for scraper run history audit logging.
 * @module models/ScraperRun
 */

import { Schema, model } from "mongoose";
import { DEFAULT_JOB_RETENTION_DAYS } from "../utils/jobLifecycle.js";

const ScraperRunSourceSchema = new Schema(
  {
    success: {
      type: Boolean,
      required: true,
    },
    jobsFound: {
      type: Number,
      default: 0,
    },
    eligibleJobsFound: {
      type: Number,
      default: 0,
    },
    inserted: {
      type: Number,
      default: 0,
    },
    updated: {
      type: Number,
      default: 0,
    },
    deleted: {
      type: Number,
      default: 0,
    },
    filteredOld: {
      type: Number,
      default: 0,
    },
    missed: {
      type: Number,
      default: 0,
    },
    expired: {
      type: Number,
      default: 0,
    },
    staleCheckSkipped: {
      type: Boolean,
      default: false,
    },
    staleCheckReason: {
      type: String,
      default: null,
    },
    retentionDays: {
      type: Number,
      default: DEFAULT_JOB_RETENTION_DAYS,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const ScraperRunSchema = new Schema(
  {
    ranAt: {
      type: Date,
      default: Date.now,
      required: true,
      immutable: true,
    },
    sources: {
      type: Map,
      of: ScraperRunSourceSchema,
      default: {},
    },
    overall: {
      totalJobs: {
        type: Number,
        required: true,
        default: 0,
      },
      sourcesSucceeded: {
        type: Number,
        required: true,
        default: 0,
      },
      sourcesFailed: {
        type: Number,
        required: true,
        default: 0,
      },
    },
  },
  {
    strict: true,
  }
);

ScraperRunSchema.index({ ranAt: -1 });

ScraperRunSchema.set("toJSON", {
  // Transforms database document representation for API JSON responses.
  transform: (doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const ScraperRun = model("ScraperRun", ScraperRunSchema);

export default ScraperRun;
