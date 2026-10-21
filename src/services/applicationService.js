import Application from '../models/Application.js';
import TailoredResume from '../models/TailoredResume.js';

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
  const resume = await TailoredResume.exists({ ...filter, status: 'completed', outputFormat: 'latex-pdf', generationId: { $exists: true, $ne: null } });
  if (!resume) return null;
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
