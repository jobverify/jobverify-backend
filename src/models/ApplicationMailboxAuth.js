import { Schema, model } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  stateHash: { type: String, required: true },
  sessionHash: { type: String, required: true, select: false },
  sessionVersion: { type: Number, required: true },
  oauthEpoch: { type: Number, required: true },
  encryptedVerifier: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ stateHash: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ user: 1 });
export default model('ApplicationMailboxAuth', schema);
