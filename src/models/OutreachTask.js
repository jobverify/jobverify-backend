import { Schema, model } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  job: { type: Schema.Types.ObjectId, ref: 'Job' },
  thread: { type: Schema.Types.ObjectId, ref: 'OutreachThread' },
  kind: { type: String, enum: ['discovery', 'draft'], required: true },
  status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
  activeKey: { type: String },
  ready: { type: Boolean, default: false, select: false },
  input: { type: Schema.Types.Mixed, select: false },
  result: { type: Schema.Types.Mixed, default: null },
  error: { type: String, default: '', maxlength: 1000 },
  leaseOwner: { type: String, select: false },
  leaseUntil: { type: Date },
  dispatchAt: { type: Date },
  attempts: { type: Number, default: 0 },
  completedAt: { type: Date },
}, { timestamps: true });
schema.index({ activeKey: 1 }, { unique: true, sparse: true });
schema.index({ status: 1, kind: 1, createdAt: 1 });
schema.index({ user: 1, thread: 1, createdAt: -1 });
export default model('OutreachTask', schema);
