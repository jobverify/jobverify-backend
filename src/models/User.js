/**
 * @file Schema and indexes for user accounts and profile data.
 * @module models/User
 */

import { Schema, model } from "mongoose";
import { PREFERRED_JOB_TYPES } from "../constants/preferredJobTypes.js";
import { ACCESS_ROLES, PLAN_IDS } from "../constants/accessPlans.js";

const MAX_PROFILE_TEXT_LENGTH = 80;
const MAX_PROFILE_ITEMS = 20;

const boundedStringList = {
  validator: (items = []) =>
    items.length <= MAX_PROFILE_ITEMS &&
    items.every((item) => String(item).length <= MAX_PROFILE_TEXT_LENGTH),
  message: `Profile lists are limited to ${MAX_PROFILE_ITEMS} items of ${MAX_PROFILE_TEXT_LENGTH} characters each.`,
};

const boundedPreferredJobTypes = {
  validator: (items = []) =>
    items.length <= MAX_PROFILE_ITEMS &&
    items.every((item) => PREFERRED_JOB_TYPES.includes(String(item))),
  message: `Preferred job types must use one of: ${PREFERRED_JOB_TYPES.join(", ")}.`,
};

const ProfilePreferenceFiltersSchema = new Schema(
  {
    company: { type: [String], default: [], validate: boundedStringList },
    jobType: { type: [String], default: [], validate: boundedStringList },
    location: { type: [String], default: [], validate: boundedStringList },
    experienceYear: { type: String, default: "" },
    roleDomain: { type: [String], default: [], validate: boundedStringList },
    workArrangement: { type: [String], default: [], validate: boundedStringList },
    datePostedDays: { type: [Number], default: [] },
    sortBy: {
      type: String,
      enum: ["all", "popularity", "latest", "oldest"],
      default: "all",
    },
  },
  { _id: false },
);

const ProfileSchema = new Schema(
  {
    name: { type: String, maxlength: MAX_PROFILE_TEXT_LENGTH },
    branch: { type: String, maxlength: MAX_PROFILE_TEXT_LENGTH },
    passingYear: { type: Number },
    preferredJobTypes: {
      type: [String],
      default: [],
      validate: boundedPreferredJobTypes,
    },
    locationPreference: { type: [String], default: [], validate: boundedStringList },
    profilePreferenceFilters: {
      type: ProfilePreferenceFiltersSchema,
      default: () => ({}),
    },
  },
  { _id: false },
);

const PremiumSchema = new Schema(
  {
    planId: {
      type: String,
      enum: Object.values(PLAN_IDS),
      default: PLAN_IDS.FREE,
    },
    status: {
      type: String,
      enum: ["inactive", "active", "expired", "cancelled"],
      default: "inactive",
    },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    lastPurchase: {
      type: Schema.Types.ObjectId,
      ref: "PlanPurchase",
      default: null,
    },
    whatsappAlertsEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const ContactSchema = new Schema(
  {
    phoneE164: {
      type: String,
      trim: true,
      default: null,
    },
    whatsappOptInAt: {
      type: Date,
      default: null,
    },
    whatsappOptOutAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    accessRole: {
      type: String,
      enum: Object.values(ACCESS_ROLES),
      default: ACCESS_ROLES.FREE,
    },
    premium: {
      type: PremiumSchema,
      default: () => ({}),
    },
    contact: {
      type: ContactSchema,
      default: () => ({}),
    },
    profile: { type: ProfileSchema, default: () => ({}) },
    savedJobs: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: "Job",
      }],
      default: [],
    },
    onboardingCompleted: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    deactivated: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    strict: true,
  },
);

UserSchema.index({ role: 1 });
UserSchema.index({ accessRole: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ "profile.passingYear": 1 });
UserSchema.index({ "premium.expiresAt": 1 });
UserSchema.index({ "contact.phoneE164": 1 }, { sparse: true });
UserSchema.index({ resetPasswordTokenHash: 1 }, { sparse: true });
UserSchema.index(
  { onboardingCompleted: 1 },
  { partialFilterExpression: { onboardingCompleted: false } }
);

UserSchema.set("toJSON", {
  // Transforms database document representation for API JSON responses.
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    if (ret._id) {
      ret.id = ret._id;
    }
    return ret;
  },
});

const User = model("User", UserSchema);

export default User;
