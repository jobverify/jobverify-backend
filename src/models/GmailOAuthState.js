import { Schema, model } from 'mongoose';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  stateHash: { type: String, required: true },
  sessionHash: { type: String, required: true, select: false },
  encryptedVerifier: { type: String, required: true, select: false },
  sessionVersion: { type: Number, required: true },
  connection: { type: Schema.Types.ObjectId, ref: 'GmailConnection', required: true },
  oauthEpoch: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ stateHash: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ user: 1 });

export default model('GmailOAuthState', schema);
