/**
 * @file Schema for referrer-owned semester referral codes.
 * @module models/ReferralCode
 */

import { Schema, model } from "mongoose";
import { PLAN_IDS } from "../constants/accessPlans.js";

const ReferralCodeSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    targetPlan: {
      type: String,
      enum: [PLAN_IDS.SEMESTER],
      default: PLAN_IDS.SEMESTER,
    },
    requiredConversions: {
      type: Number,
      default: 3,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "rewarded", "disabled"],
      default: "active",
      index: true,
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
    rewardPurchaseId: {
      type: Schema.Types.ObjectId,
      ref: "PlanPurchase",
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

ReferralCodeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const ReferralCode = model("ReferralCode", ReferralCodeSchema);

export default ReferralCode;
