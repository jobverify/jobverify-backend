import Job from '../models/Job.js';
import { PUBLIC_JOB_TYPE_EXPRESSION } from '../utils/publicJobType.js';
import { applyPublicJobVisibility } from '../utils/publicJobVisibility.js';

const label = field => ({ $trim: { input: { $ifNull: [field === 'jobType' ? PUBLIC_JOB_TYPE_EXPRESSION : '$' + field, ''] } } });
const ranking = (field, limit) => [
  { $group: { _id: { $toLower: label(field) }, label: { $first: label(field) }, count: { $sum: 1 } } },
  { $sort: { count: -1, label: 1 } },
  ...(limit ? [{ $limit: limit }] : []),
  { $project: { _id: 0, label: { $cond: [{ $eq: ['$label', ''] }, 'Not specified', '$label'] }, count: 1 } },
];

export async function getJobSnapshot(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const [snapshot] = await Job.aggregate([
      { $match: applyPublicJobVisibility({ status: 'active' }, req.siteSettings) },
      { $facet: {
        totals: [{ $count: 'count' }],
        companyTotals: [{ $group: { _id: { $toLower: label('company') } } }, { $count: 'count' }],
        companies: ranking('company', 10),
        locations: ranking('city', 10),
        jobTypes: ranking('jobType'),
      } },
    ]).exec();
    res.json({ success: true, data: {
      generatedAt: new Date().toISOString(),
      totalJobs: snapshot?.totals[0]?.count ?? 0,
      totalCompanies: snapshot?.companyTotals[0]?.count ?? 0,
      companies: snapshot?.companies ?? [],
      locations: snapshot?.locations ?? [],
      jobTypes: snapshot?.jobTypes ?? [],
    } });
  } catch (error) { next(error); }
}
