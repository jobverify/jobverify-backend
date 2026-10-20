import { Schema, model } from 'mongoose';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  email: { type: String, trim: true, lowercase: true, default: '', maxlength: 320 },
  encryptedRefreshToken: { type: String, select: false },
  connected: { type: Boolean, default: true, required: true },
  connectionVersion: { type: String, required: true },
  oauthEpoch: { type: Number, default: 0 },
  sendClaimToken: { type: String, default: '', select: false },
  sendClaimedAt: { type: Date, default: null },
  nextSendAt: { type: Date, default: () => new Date(0) },
  // Last 25 attempts suffice to enforce the rolling 24-hour allowance. Attempts
  // remain reserved after uncertain outcomes, so a crash cannot bypass limits.
  sendReservations: { type: [Date], default: [] },
}, { timestamps: true });
schema.index({ user: 1 }, { unique: true });
schema.index({ email: 1 }, { unique: true, partialFilterExpression: { connected: true } });
schema.set('toJSON', { transform(_document, value) { delete value.encryptedRefreshToken; delete value.sendReservations; delete value.__v; return value; } });

export default model('GmailConnection', schema);
