/**
 * @file Schema for deduplicated job alert deliveries.
 * @module models/JobAlertDelivery
 */

import { Schema, model } from "mongoose";

const JobAlertDeliverySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    channel: {
      type: String,
      enum: ["whatsapp"],
      default: "whatsapp",
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "skipped"],
      default: "queued",
      index: true,
    },
    reason: {
      type: String,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

JobAlertDeliverySchema.index(
  { user: 1, job: 1, channel: 1 },
  { unique: true },
);

JobAlertDeliverySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    if (ret._id) ret.id = ret._id;
    return ret;
  },
});

const JobAlertDelivery = model("JobAlertDelivery", JobAlertDeliverySchema);

export default JobAlertDelivery;
