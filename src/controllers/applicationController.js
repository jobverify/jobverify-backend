import mongoose from 'mongoose';
import Application from '../models/Application.js';
import TailoredResume from '../models/TailoredResume.js';
import Job from '../models/Job.js';
import { safeApplicationUrl } from '../services/applicationService.js';
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
    // Start with durable resume requests so even requests queued before this
    // feature appear without a migration or an employer-page click.
    const [result] = await TailoredResume.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(req.user._id)) } },
      { $lookup: { from: Application.collection.name, let: { owner: '$user', jobId: '$job' }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$user', '$$owner'] }, { $eq: ['$job', '$$jobId'] }] } } },
      ], as: 'application' } },
      { $lookup: { from: Job.collection.name, localField: 'job', foreignField: '_id', pipeline: [
        { $project: { title: 1, company: 1, location: 1, city: 1, jobType: 1, applicationUrl: 1, applyUrl: 1, sourceUrl: 1 } },
      ], as: 'listing' } },
      { $set: { application: { $first: '$application' }, listing: { $first: '$listing' } } },
      { $match: { $or: [{ 'application._id': { $exists: true } }, { 'listing._id': { $exists: true } }] } },
      { $project: {
        _id: { $ifNull: ['$application._id', { $concat: ['resume:', { $toString: '$job' }] }] },
        job: 1, status: { $ifNull: ['$application.status', 'opened'] },
        canConfirm: { $ne: [{ $ifNull: ['$application._id', null] }, null] },
        firstOpenedAt: { $ifNull: ['$application.firstOpenedAt', null] },
        appliedAt: { $ifNull: ['$application.appliedAt', null] },
        resumeStatus: '$status', resumeRequestedAt: { $ifNull: ['$requestedAt', '$createdAt'] },
        trackedAt: { $ifNull: ['$application.firstOpenedAt', { $ifNull: ['$requestedAt', '$createdAt'] }] },
        jobSnapshot: { $ifNull: ['$application.jobSnapshot', {
          title: '$listing.title', company: '$listing.company',
          location: { $ifNull: ['$listing.location', '$listing.city'] }, jobType: '$listing.jobType',
          applicationUrl: '$listing.applicationUrl', applyUrl: '$listing.applyUrl', sourceUrl: '$listing.sourceUrl',
        }] },
      } },
      { $facet: {
        items: [
          ...(status === 'all' ? [] : [{ $match: { status } }]),
          { $sort: { trackedAt: -1, _id: -1 } }, { $skip: (page - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE },
        ],
        counts: [{ $group: { _id: null, total: { $sum: 1 }, applied: { $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] } } } }],
      } },
    ]);
    const { total = 0, applied = 0 } = result.counts[0] ?? {};
    const items = result.items.map(item => ({ ...item, jobSnapshot: {
      title: item.jobSnapshot.title, company: item.jobSnapshot.company,
      location: item.jobSnapshot.location || '', jobType: item.jobSnapshot.jobType || '',
      applicationUrl: safeApplicationUrl(item.jobSnapshot),
    } }));
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
