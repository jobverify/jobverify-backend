import { buildRewriteInput, REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';

const snapshotFields = [
  'title', 'originalTitle', 'company', 'sourceDescription', 'jobDescription', 'description',
  'minimumQualification', 'preferredQualification', 'sourceEmploymentType',
  'sourceExperienceRequired', 'location', 'salary', 'sourceContentHashVersion',
  'descriptionRewrite.status', 'descriptionRewrite.inputHash', 'descriptionRewrite.attempts',
  'descriptionRewrite.queuedAt', 'descriptionRewrite.nextAttemptAt',
  'descriptionRewrite.policyVersion',
];

// Also guard the actual inputs: a concurrent writer may change a field before its hash.
export const rewriteSnapshotFilter = job => ({
  _id: job._id, status: 'active', sourceContentHash: job.sourceContentHash,
  // Literal-first expressions avoid Mongoose string setters trimming snapshot values.
  $expr: { $and: snapshotFields.map(field => {
    const value = field.split('.').reduce((object, key) => object?.[key], job);
    return value === undefined || value === null
      ? { $eq: [{ $type: '$' + field }, value === undefined ? 'missing' : 'null'] }
      : { $eq: [{ $literal: value }, '$' + field] };
  }) },
});

/** Repair queue metadata only when the stored source independently verifies it. */
export const reconcileRewriteCandidate = async (job, { update, now = new Date() } = {}) => {
  const input = buildRewriteInput(job);
  if (job.status !== 'active' || !['pending', 'failed'].includes(job.descriptionRewrite?.status)
    || input.inputHash !== job.sourceContentHash) return { kind: 'stale' };
  const changedPolicy = job.descriptionRewrite.status === 'failed'
    && typeof job.descriptionRewrite.policyVersion === 'string'
    && job.descriptionRewrite.policyVersion !== REWRITE_MODEL.policyVersion;
  if (input.eligible && job.descriptionRewrite.inputHash === input.inputHash && !changedPolicy) {
    return { kind: 'ready', job, input, repaired: false };
  }

  const reason = input.eligible ? undefined : 'insufficient_source';
  const descriptionRewrite = { status: input.eligible ? 'pending' : 'skipped',
    inputHash: input.inputHash, queuedAt: now, attempts: 0, policyVersion: REWRITE_MODEL.policyVersion,
    ...(reason ? { reason, attemptedAt: now } : {}),
  };
  const saved = await update(rewriteSnapshotFilter(job), { $set: { descriptionRewrite } });
  if (saved.matchedCount === 0) return { kind: 'conflict' };
  return { kind: input.eligible ? 'ready' : 'skipped', repaired: true, reason,
    job: { ...job, descriptionRewrite }, input };
};
