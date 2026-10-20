import Resume from '../models/Resume.js';
import TailoredResume from '../models/TailoredResume.js';
import User from '../models/User.js';
import { inspectResume, ResumeValidationError } from '../utils/resumeFile.js';
import { respondWithInternalError } from '../utils/respondWithInternalError.js';

const metadata = record => record ? ({
  filename: record.filename, extension: record.extension, mimeType: record.mimeType,
  size: record.size, sha256: record.sha256, uploadedAt: record.uploadedAt,
}) : null;
const ownerFilter = user => ({ _id: user._id, user: user._id });
const activeOwner = user => ({ _id: user._id, deactivated: { $ne: true }, outreachDeletingAt: null });
// Mongoose validation errors can contain the uploaded bytes. Log only error
// classification, never a resume document, query payload, or filename.
const failure = (res, error, message) => respondWithInternalError(res,
  { name: error?.name, code: Number.isInteger(error?.code) ? error.code : undefined },
  { message, logLabel: '[Resume] Storage request failed:' });

export async function getResume(req, res) {
  try {
    const record = await Resume.findOne(ownerFilter(req.user)).lean();
    return res.status(200).json({ success: true, data: metadata(record) });
  } catch (error) {
    return failure(res, error, 'Could not load your resume.');
  }
}

export async function uploadResume(req, res) {
  try {
    let filename;
    try { filename = decodeURIComponent(req.headers['x-resume-filename'] ?? ''); }
    catch { throw new ResumeValidationError('The resume filename is invalid.'); }
    const file = inspectResume(filename, req.body);
    if (!await User.exists(activeOwner(req.user))) return res.status(409).json({ success: false, message: 'This account is unavailable for resume uploads.' });
    const filter = ownerFilter(req.user);
    const update = { $set: { ...file, data: req.body, uploadedAt: new Date() }, $setOnInsert: { user: req.user._id } };
    let record;
    try {
      record = await Resume.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      record = await Resume.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    }
    // An account may be removed while its upload is in flight. Do not recreate
    // personal data after its deletion sweep has already passed this collection.
    if (!await User.exists(activeOwner(req.user))) {
      await Resume.deleteOne({ ...filter, sha256: file.sha256 });
      return res.status(409).json({ success: false, message: 'This account is unavailable for resume uploads.' });
    }
    await TailoredResume.updateMany({ user: req.user._id, status: { $in: ['queued', 'running'] }, sourceResumeSha: { $ne: file.sha256 } }, {
      $set: { status: 'failed', ready: false, error: 'Your resume changed. Generate a new version.' },
      $inc: { revision: 1 }, $unset: { leaseOwner: 1, leaseUntil: 1 },
    });
    return res.status(200).json({ success: true, data: metadata(record) });
  } catch (error) {
    if (error instanceof ResumeValidationError) return res.status(error.statusCode).json({ success: false, message: error.message });
    return failure(res, error, 'Could not save your resume. Please try again.');
  }
}

export async function downloadResume(req, res) {
  try {
    const record = await Resume.findOne(ownerFilter(req.user)).select('+data');
    if (!record) return res.status(404).json({ success: false, message: 'You have not uploaded a resume yet.' });
    res.attachment(record.filename);
    res.set('Content-Type', record.mimeType);
    res.set('Content-Length', String(record.data.length));
    return res.send(record.data);
  } catch (error) {
    return failure(res, error, 'Could not download your resume.');
  }
}

export async function removeResume(req, res) {
  try {
    await Resume.deleteOne(ownerFilter(req.user));
    await TailoredResume.deleteMany({ user: req.user._id });
    return res.status(200).json({ success: true, data: null });
  } catch (error) {
    return failure(res, error, 'Could not remove your resume. Please try again.');
  }
}
