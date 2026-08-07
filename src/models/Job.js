/**
 * @file Schema and indexes for scraped job listings.
 * @module models/Job
 */

import { Schema, model } from "mongoose";
import { buildJobSearchKeys } from "../utils/jobSearchKeys.js";
import { buildJobDerivedFields } from "../utils/jobDerivedFields.js";

const JobSkillSchema = new Schema(
  {
    skillId: { type: String, trim: true, required: true },
    canonicalName: { type: String, trim: true, required: true },
    category: { type: String, trim: true, required: true },
    required: { type: Boolean, default: false },
    preferred: { type: Boolean, default: false },
    confidence: { type: String, trim: true, default: "medium" },
    extractionSource: { type: String, trim: true, default: null },
    matchedPhrase: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const ExperienceProfileSchema = new Schema(
  {
    rawText: { type: String, trim: true, default: null },
    minimumYears: { type: Number, default: null },
    maximumYears: { type: Number, default: null },
    isOpenEnded: { type: Boolean, default: false },
    preferredMinimumYears: { type: Number, default: null },
    hasExplicitExperience: { type: Boolean, default: false },
    confidence: { type: String, trim: true, default: "low" },
    evidence: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const FilterSignalsSchema = new Schema(
  {
    confidence: {
      experience: { type: String, trim: true, default: "low" },
      seniority: { type: String, trim: true, default: "low" },
      roleDomain: { type: String, trim: true, default: "low" },
      workArrangement: { type: String, trim: true, default: "low" },
    },
  },
  { _id: false },
);

const isHttpUrl = (value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const JobSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    originalTitle: { type: String, trim: true, default: null },
    normalizedTitle: { type: String, trim: true, default: null },
    company: {
      type: String,
      trim: true,
      required: true,
    },
    companyKey: { type: String, trim: true, default: null },
    companyDomain: { type: String, trim: true, default: null },
    jobCategory: { type: String, trim: true, default: null },
    engineeringDomain: { type: String, trim: true, default: null },
    employmentType: { type: String, trim: true, default: null },
    experienceLevel: { type: String, trim: true, default: null },
    jobType: { type: String, trim: true },
    location: { type: String, trim: true },
    city: { type: String, trim: true },
    cityKey: { type: String, trim: true, default: null },
    publicCityKey: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    remoteStatus: { type: String, trim: true, default: null },
    locations: { type: [String], default: [] },
    locationKeys: { type: [String], default: [] },
    department: { type: String, trim: true },
    eligibleBatches: { type: [Number], default: [] },
    branches: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    source: { type: String },
    sourceUrl: {
      type: String,
      validate: {
        validator: isHttpUrl,
        message: "sourceUrl must be an http(s) URL",
      },
    },
    applyUrl: {
      type: String,
      default: null,
      validate: {
        validator: isHttpUrl,
        message: "applyUrl must be an http(s) URL",
      },
    },
    companyCareerPage: {
      type: String,
      default: null,
      validate: {
        validator: isHttpUrl,
        message: "companyCareerPage must be an http(s) URL",
      },
    },
    atsPlatform: { type: String, trim: true, default: null },
    workdayApplicationStatus: {
      type: String,
      enum: ["available", "temporarily_unavailable", "unavailable"],
      default: null,
    },
    workdayApplicationStatusReason: { type: String, trim: true, default: null },
    workdayApplicationStatusCheckedAt: { type: Date, default: null },
    description: { type: String, trim: true, default: null },
    minimumQualification: { type: String, trim: true, default: null },
    preferredQualification: { type: String, trim: true, default: null },
    experienceRequired: { type: String, trim: true, default: null },
    publicExperienceChecked: { type: Boolean, default: false },
    salary: { type: String, trim: true, default: null },
    skillIds: { type: [String], default: [] },
    requiredSkillIds: { type: [String], default: [] },
    preferredSkillIds: { type: [String], default: [] },
    jobSkills: { type: [JobSkillSchema], default: [] },
    experienceBucket: { type: String, trim: true, default: "unspecified" },
    experienceYears: { type: [Number], default: [] },
    experienceProfile: {
      type: ExperienceProfileSchema,
      default: () => ({}),
    },
    seniority: { type: String, trim: true, default: "Unknown" },
    primaryRoleDomain: { type: String, trim: true, default: "Other" },
    secondaryRoleDomains: { type: [String], default: [] },
    workArrangement: { type: String, trim: true, default: "Not specified" },
    filterSignals: {
      type: FilterSignalsSchema,
      default: () => ({}),
    },
    taxonomyVersion: { type: String, trim: true, default: null },
    extractionVersion: { type: String, trim: true, default: null },
    extractedAt: { type: Date, default: null },
    jobId: { type: String, trim: true, default: null },
    requisitionId: { type: String, trim: true, default: null },
    fingerprint: {
      type: String,
      required: true,
      unique: true,
    },
    postedAt: { type: Date },
    sortDate: { type: Date, default: null },
    closingDate: { type: Date },
    scrapedAt: { type: Date, default: Date.now },
    scrapedTimestamp: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    missedScrapeCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "expired", "hidden"],
      default: "active",
      index: true,
    },
    isPublicIndia: { type: Boolean, default: false, index: true },
    clickCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    strict: true,
  },
);

JobSchema.pre("validate", function setJobSearchKeys(next) {
  Object.assign(this, buildJobSearchKeys(this), buildJobDerivedFields(this));
  next();
});

JobSchema.index({ status: 1, isPublicIndia: 1, sortDate: -1, _id: -1 });
JobSchema.index({ status: 1, closingDate: 1 }); // query: roles closing soon
JobSchema.index({ status: 1, isPublicIndia: 1, clickCount: -1, sortDate: -1, _id: -1 }); // popularity sort
JobSchema.index({ status: 1, company: 1 }); // query meta & company queries
JobSchema.index({ status: 1, city: 1 }); // query meta & city queries
JobSchema.index({ status: 1, isPublicIndia: 1, companyKey: 1, sortDate: -1, _id: -1 });
JobSchema.index({ status: 1, isPublicIndia: 1, locationKeys: 1, sortDate: -1, _id: -1 });
JobSchema.index({ status: 1, isPublicIndia: 1, companyKey: 1, locationKeys: 1, sortDate: -1, _id: -1 });
JobSchema.index({ source: 1, status: 1, missedScrapeCount: 1 });
JobSchema.index({ source: 1, status: 1, lastSeenAt: 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ city: 1 });
JobSchema.index({ locations: 1 });
JobSchema.index({ department: 1 });
JobSchema.index({ jobType: 1 });
JobSchema.index({ normalizedTitle: 1 });
JobSchema.index({ engineeringDomain: 1 });
JobSchema.index({ companyDomain: 1 });
JobSchema.index({ status: 1, skillIds: 1 });
JobSchema.index({ status: 1, requiredSkillIds: 1 });
JobSchema.index({ status: 1, experienceBucket: 1 });
JobSchema.index({ status: 1, experienceYears: 1 });
JobSchema.index({ status: 1, isPublicIndia: 1, experienceYears: 1, sortDate: -1, _id: -1 });
JobSchema.index({ status: 1, seniority: 1 });
JobSchema.index({ status: 1, primaryRoleDomain: 1 });
JobSchema.index({ status: 1, workArrangement: 1 });
JobSchema.index({ secondaryRoleDomains: 1 });
JobSchema.index({ jobId: 1 });
JobSchema.index({ requisitionId: 1 });
JobSchema.index({ eligibleBatches: 1 });
JobSchema.index({ branches: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index(
  {
    title: "text",
    company: "text",
    description: "text",
    minimumQualification: "text",
    preferredQualification: "text",
    experienceRequired: "text",
    requiredSkills: "text",
  },
  {
    name: "job_search_text",
    weights: {
      title: 10,
      company: 8,
      requiredSkills: 5,
      experienceRequired: 3,
      minimumQualification: 2,
      preferredQualification: 2,
      description: 1,
    },
  },
);

JobSchema.set("toJSON", {
  // Transforms database document representation for API JSON responses.
  transform: (doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const Job = model("Job", JobSchema);

export default Job;
