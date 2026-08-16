/**
 * @file Schema for paid and rewarded premium plan purchases.
 * @module models/PlanPurchase
 */

import { Schema, model } from "mongoose";
import { ACCESS_ROLES, PLAN_IDS } from "../constants/accessPlans.js";

const PlanPurchaseSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: String,
      enum: [PLAN_IDS.MONTHLY, PLAN_IDS.SEMESTER, PLAN_IDS.YEARLY],
      required: true,
    },
    accessRole: {
      type: String,
      enum: [ACCESS_ROLES.MONTHLY, ACCESS_ROLES.SEMESTER, ACCESS_ROLES.YEARLY],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "free_referral",
      ],
      default: "created",
      index: true,
    },
    provider: {
      type: String,
      enum: ["razorpay", "mock", "manual"],
      default: "mock",
    },
    providerOrderId: {
      type: String,
      default: null,
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    providerSignature: {
      type: String,
      default: null,
    },
    referralCodeUsed: {
      type: String,
      default: null,
      trim: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

PlanPurchaseSchema.index({ user: 1, createdAt: -1 });
PlanPurchaseSchema.index(
  { provider: 1, providerOrderId: 1 },
  {
    name: "provider_1_providerOrderId_1",
    unique: true,
    partialFilterExpression: { providerOrderId: { $type: "string" } },
  },
);
PlanPurchaseSchema.index(
  { provider: 1, providerPaymentId: 1 },
  {
    name: "provider_1_providerPaymentId_1",
    unique: true,
    partialFilterExpression: { providerPaymentId: { $type: "string" } },
  },
);

PlanPurchaseSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const PlanPurchase = model("PlanPurchase", PlanPurchaseSchema);

export default PlanPurchase;
