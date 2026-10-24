import { Schema, model } from 'mongoose';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  email: { type: String, default: '', maxlength: 320 },
  connected: { type: Boolean, default: false },
  connectionVersion: { type: String, required: true },
  oauthEpoch: { type: Number, default: 0 },
  encryptedRefreshToken: { type: String, select: false },
  lastSyncedAt: { type: Date, default: null },
  nextSyncAt: { type: Date, default: () => new Date(0) },
  scanStartedAt: { type: Date, default: null },
  scanAfter: { type: Number, default: 0 },
  pageToken: { type: String, default: '', select: false },
  leaseToken: { type: String, default: '', select: false },
  leaseUntil: { type: Date, default: () => new Date(0) },
  error: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });
schema.index({ user: 1 }, { unique: true });
schema.index({ connected: 1, nextSyncAt: 1, leaseUntil: 1 });
schema.set('toJSON', { transform(_doc, value) { delete value.encryptedRefreshToken; delete value.leaseToken; delete value.pageToken; return value; } });
export default model('ApplicationMailbox', schema);
