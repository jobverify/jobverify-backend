import mongoose from 'mongoose';
import Application from '../models/Application.js';
import TailoredResume from '../models/TailoredResume.js';
import { respondWithInternalError } from '../utils/respondWithInternalError.js';

const PAGE_SIZE = 20;

export async function getApplications(req, res) {
  const { page: rawPage = '1', status = 'all' } = req.query ?? {};
  const page = Number(rawPage);
  if (typeof rawPage !== 'string' || !/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1 || page > 100000
    || !['all', 'opened', 'applied'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid application page or status.' });
  }
  try {
    const jobs = await TailoredResume.distinct('job', { user: req.user._id, status: 'completed', output: { $ne: null } });
    const owner = { user: req.user._id, job: { $in: jobs } };
    const filter = status === 'all' ? owner : { ...owner, status };
    const [items, total, applied] = await Promise.all([
      Application.find(filter).sort({ firstOpenedAt: -1, _id: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      Application.countDocuments(owner),
      Application.countDocuments({ ...owner, status: 'applied' }),
    ]);
    const summary = { total, opened: total - applied, applied };
    const filteredTotal = status === 'all' ? total : summary[status];
    return res.status(200).json({
      success: true, data: items, summary,
      pagination: { page, limit: PAGE_SIZE, total: filteredTotal, totalPages: Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE)) },
    });
  } catch (error) {
    return respondWithInternalError(res, error, { message: 'Could not load your applications.' });
  }
}

export async function markApplicationApplied(req, res) {
  const { applicationId } = req.params;
  if (!mongoose.isObjectIdOrHexString(applicationId)) {
    return res.status(400).json({ success: false, message: 'Invalid application ID.' });
  }
  try {
    const filter = { _id: applicationId, user: req.user._id };
    // Only the first manual confirmation sets the date. Repeated requests and
    // reopening the employer page cannot change or clear that confirmation.
    const application = await Application.findOneAndUpdate(
      { ...filter, status: 'opened' },
      { $set: { status: 'applied', appliedAt: new Date() } },
      { new: true, runValidators: true },
    ) ?? await Application.findOne(filter);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return respondWithInternalError(res, error, { message: 'Could not save your application status.' });
  }
}
