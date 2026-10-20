import { Schema, model } from 'mongoose';
import { MAX_RESUME_BYTES, RESUME_MIME_TYPES } from '../utils/resumeFile.js';

const schema = new Schema({
  // The user's ID is the primary key: one current resume per account, with no
  // dependency on secondary index creation for concurrent first uploads.
  _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  filename: { type: String, required: true, maxlength: 200 },
  extension: { type: String, enum: Object.keys(RESUME_MIME_TYPES), required: true },
  mimeType: { type: String, enum: Object.values(RESUME_MIME_TYPES), required: true },
  size: { type: Number, required: true, min: 1, max: MAX_RESUME_BYTES },
  sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  data: { type: Buffer, required: true, select: false, validate: value => (typeof value.length === 'number' ? value.length : value.buffer?.length) <= MAX_RESUME_BYTES },
  uploadedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

schema.set('toJSON', { transform(_doc, value) { delete value.data; delete value.__v; return value; } });
export default model('Resume', schema);
