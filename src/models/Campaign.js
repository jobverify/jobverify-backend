import { Schema, model } from 'mongoose';

export const CAMPAIGN_ITEM_STATUSES = ['draft', 'queued', 'sending', 'sent', 'failed', 'review_required', 'cancelled', 'removed'];
const itemSchema = new Schema({
  thread: { type: Schema.Types.ObjectId, ref: 'OutreachThread', required: true },
  threadRevision: { type: Number, required: true },
  threadSnapshotHash: { type: String, required: true },
  name: { type: String, default: '', maxlength: 300 },
  company: { type: String, default: '', maxlength: 500 },
  email: { type: String, default: '', maxlength: 320 },
  emailConfirmed: { type: Boolean, default: false },
  emailStatus: { type: String, enum: ['verified', 'public', 'unverified', 'unavailable'], default: 'unavailable' },
  subject: { type: String, default: '', maxlength: 500 },
  body: { type: String, default: '', maxlength: 20000 },
  status: { type: String, enum: CAMPAIGN_ITEM_STATUSES, default: 'draft', required: true },
  scheduledFor: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  error: { type: String, default: '', maxlength: 500 },
  claimToken: { type: String, select: false },
  claimedAt: { type: Date, default: null },
  providerMessageId: { type: String, default: '', select: false },
});

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  sender: { type: String, default: '', maxlength: 320 },
  connectionVersion: { type: String, default: '', select: false },
  status: { type: String, enum: ['draft', 'approved', 'completed', 'cancelled'], default: 'draft', required: true },
  revision: { type: Number, default: 0 },
  approvedAt: { type: Date, default: null },
  approvedRevision: { type: Number, default: null },
  items: { type: [itemSchema], default: [], validate: { validator: items => items.length <= 100, message: 'A campaign may contain at most 100 messages.' } },
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ status: 1, 'items.status': 1, createdAt: 1 });

export default model('Campaign', schema);
