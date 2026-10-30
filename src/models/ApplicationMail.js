import { Schema, model } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true, immutable: true },
  connectionVersion: { type: String, required: true },
  mailboxEmail: { type: String, required: true, maxlength: 320 },
  messageId: { type: String, required: true, maxlength: 200 },
  threadId: { type: String, default: '', maxlength: 200 },
  subject: { type: String, default: '', maxlength: 500 },
  sender: { type: String, default: '', maxlength: 500 },
  excerpt: { type: String, default: '', maxlength: 500 },
  receivedAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'linked', 'dismissed'], default: 'pending' },
  application: { type: Schema.Types.ObjectId, ref: 'Application', default: null },
  candidates: [{ type: Schema.Types.ObjectId, ref: 'Application' }],
  matchReason: { type: String, default: '' },
  // Internal evidence only; persisted trust is never authorization for a retry.
  trust: { type: new Schema({
    status: { type: String, enum: ['pending', 'authenticated'] }, reason: { type: String, maxlength: 80 },
    proof: { type: String, maxlength: 64 }, receipt: { type: String, maxlength: 64 }, verifiedAt: Date,
  }, { _id: false }), select: false },
}, { timestamps: true });
// Reconnecting the same mailbox must not replay old evidence.
schema.index({ user: 1, mailboxEmail: 1, messageId: 1 }, { unique: true });
schema.index({ user: 1, status: 1, receivedAt: -1, _id: -1 });
export default model('ApplicationMail', schema);
