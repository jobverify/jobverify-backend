import { Schema, model } from 'mongoose';
const schema = new Schema({
  key: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  used: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default model('OutreachUsage', schema);
