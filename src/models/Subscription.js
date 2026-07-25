/**
 * @file Schema and indexes for user job alert subscriptions.
 * @module models/Subscription
 */

import { Schema, model } from "mongoose";

const FiltersSchema = new Schema(
  {
    batches: { type: [Number], default: [] },
    branches: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    jobTypes: { type: [String], default: [] },
    skills: { type: [String], default: [] },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    filters: {
      type: FiltersSchema,
      default: () => ({}),
    },
    frequency: {
      type: String,
      enum: ["immediate", "daily", "weekly"],
      default: "daily",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

SubscriptionSchema.index({
  isActive: 1,
  frequency: 1,
  lastSentAt: 1,
});

SubscriptionSchema.set("toJSON", {
  // Transforms database document representation for API JSON responses.
  transform: (doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const Subscription = model("Subscription", SubscriptionSchema);

export default Subscription;
