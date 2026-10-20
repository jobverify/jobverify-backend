import { Schema, model } from 'mongoose';

export const OUTREACH_STATUSES = ['saved', 'drafted', 'sent', 'followed_up', 'replied', 'interview', 'closed'];
export const outreachJobSnapshotSchema = new Schema({
  title: { type: String, required: true, maxlength: 1000 },
  company: { type: String, required: true, maxlength: 500 },
  companyDomain: { type: String, default: '', maxlength: 253 },
  location: { type: String, default: '', maxlength: 2000 },
  jobUrl: { type: String, default: '', maxlength: 8192 },
}, { _id: false });
export const outreachContactSchema = new Schema({
  name: { type: String, required: true, maxlength: 200 },
  title: { type: String, default: '', maxlength: 500 },
  linkedinUrl: { type: String, default: '', maxlength: 8192 },
  sourceUrl: { type: String, required: true, maxlength: 8192 },
  evidence: { type: String, required: true, maxlength: 3000 },
  kind: { type: String, enum: ['hiring_post_author', 'likely_contact'], required: true },
  email: { type: String, default: '', maxlength: 320 },
  emailStatus: { type: String, enum: ['verified', 'public', 'unverified', 'unavailable'], default: 'unavailable' },
  emailConfirmed: { type: Boolean, default: false },
}, { _id: false });
export const outreachDraftSchema = new Schema({
  linkedin: { type: String, default: '', maxlength: 3000 },
  emailSubject: { type: String, default: '', maxlength: 250 },
  emailBody: { type: String, default: '', maxlength: 12000 },
}, { _id: false });
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, immutable: true },
  contactKey: { type: String, required: true, immutable: true },
  jobSnapshot: { type: outreachJobSnapshotSchema, required: true },
  contact: { type: outreachContactSchema, required: true },
  draft: { type: outreachDraftSchema, default: () => ({}) },
  revision: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: OUTREACH_STATUSES, default: 'saved' },
  lastSentAt: { type: Date, default: null },
  followUpAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ user: 1, job: 1, contactKey: 1 }, { unique: true });
schema.index({ user: 1, status: 1, updatedAt: -1 });
schema.index({ user: 1, followUpAt: 1 });
export default model('OutreachThread', schema);
