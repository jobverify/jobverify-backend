import { Schema, model } from 'mongoose';
import { outreachContactSchema, outreachJobSnapshotSchema } from './OutreachThread.js';
const schema = new Schema({
  contextHash: { type: String, required: true },
  contacts: { type: [outreachContactSchema], default: [] },
  jobSnapshot: outreachJobSnapshotSchema,
  expiresAt: { type: Date, default: null },
  leaseOwner: String,
  leaseUntil: Date,
}, { timestamps: true });
schema.index({ contextHash: 1 }, { unique: true });
// Explicit expiration checks preserve the lease row; no TTL deletion during a search.
export default model('OutreachDiscoveryCache', schema);
