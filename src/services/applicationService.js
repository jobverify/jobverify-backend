import Application from '../models/Application.js';

// Called only by server-side observers. HTTP clients never choose the source.
export async function recordApplicationEvidence(user, applicationId, input) {
  if (!['self_reported', 'email', 'auto_apply'].includes(input.source)
    || typeof input.key !== 'string' || !input.key || input.key.length > 300
    || !(input.observedAt instanceof Date) || !Number.isFinite(input.observedAt.getTime())) throw new Error('Invalid application evidence.');
  const evidence = { key: input.key, source: input.source, observedAt: input.observedAt,
    summary: String(input.summary || '').slice(0, 500), reference: String(input.reference || '').slice(0, 300) };
  const filter = { _id: applicationId, user };
  // The event and the status commit in one document update. Concurrent observers
  // cannot lose evidence, duplicate an event, or replace the first applied date.
  return await Application.findOneAndUpdate({ ...filter, 'evidence.key': { $ne: evidence.key } }, [{ $set: {
    status: 'applied', appliedAt: { $ifNull: ['$appliedAt', evidence.observedAt] },
    confirmationSource: { $cond: [{ $in: [{ $ifNull: ['$confirmationSource', ''] }, ['', 'self_reported']] }, { $literal: evidence.source }, '$confirmationSource'] },
    evidence: { $slice: [{ $concatArrays: [{ $ifNull: ['$evidence', []] }, { $literal: [evidence] }] }, -20] },
    updatedAt: new Date(),
  } }], { new: true, updatePipeline: true }) ?? await Application.findOne(filter);
}

export function safeApplicationUrl(job) {
  for (const value of [job.applicationUrl, job.applyUrl, job.sourceUrl]) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
    } catch {
      // Use the same validated fallback as the public job response.
    }
  }
  return '';
}

export async function recordApplicationOpen(user, job, now = new Date()) {
  const filter = { user, job: job._id };
  const update = {
    $setOnInsert: {
      ...filter,
      status: 'opened',
      firstOpenedAt: now,
      jobSnapshot: {
        title: String(job.title ?? '').slice(0, 1000),
        company: String(job.company ?? '').slice(0, 500),
        location: String(job.location || job.city || '').slice(0, 2000),
        jobType: String(job.jobType ?? '').slice(0, 100),
        applicationUrl: safeApplicationUrl(job).slice(0, 8192),
      },
    },
    $set: { lastOpenedAt: now },
  };
  try {
    return await Application.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Another tab may have inserted this same user/job while we were opening it.
    return Application.findOneAndUpdate(filter, { $set: { lastOpenedAt: now } }, { upsert: false, new: true });
  }
}
