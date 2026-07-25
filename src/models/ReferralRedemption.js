/**
 * @file Schema for unique counted referral purchases.
 * @module models/ReferralRedemption
 */

import { Schema, model } from "mongoose";
import { PLAN_IDS } from "../constants/accessPlans.js";

const ReferralRedemptionSchema = new Schema(
  {
    referralCode: {
      type: Schema.Types.ObjectId,
      ref: "ReferralCode",
      required: true,
      index: true,
    },
    referrer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purchase: {
      type: Schema.Types.ObjectId,
      ref: "PlanPurchase",
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      enum: [PLAN_IDS.SEMESTER],
      default: PLAN_IDS.SEMESTER,
    },
    status: {
      type: String,
      enum: ["pending", "counted", "revoked"],
      default: "counted",
      index: true,
    },
    countedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

ReferralRedemptionSchema.index(
  { referralCode: 1, referredUser: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "counted" },
  },
);

ReferralRedemptionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const ReferralRedemption = model("ReferralRedemption", ReferralRedemptionSchema);

export default ReferralRedemption;
