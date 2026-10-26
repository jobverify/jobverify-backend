import { Schema, model } from 'mongoose';
const schema = new Schema({
  key: { type: String, required: true },
  email: { type: String, default: '' },
  emailStatus: { type: String, enum: ['verified', 'public', 'unverified', 'unavailable'], required: true },
  emailSourceUrl: { type: String, default: '', maxlength: 8192 },
  emailEvidence: { type: String, default: '', maxlength: 3000 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default model('OutreachEmailCache', schema);
