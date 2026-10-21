import { randomUUID } from 'node:crypto';
import Resume from '../models/Resume.js';
import User from '../models/User.js';
import TailoredResume from '../models/TailoredResume.js';
import { artifactBytes, createResumeArtifact, deleteResumeArtifact, readResumeArtifact } from './resumeArtifactService.js';
import { dispatchTailoredResumes, requireTailoredResumeActions, tailoredResumeActionsConfigured } from './resumeTailoringWorkflow.js';
import { tailoringError } from './resumeTailoringContent.js';

export const activeResumeStatuses = ['queued', 'running'];
export const activeResumeOwner = user => ({ _id: user, deactivated: { $ne: true }, outreachDeletingAt: null });
const ownerFilter = user => ({ _id: user, user });
export function preparationMetadata(record) {
  const p = record?.preparation || {};
  const valid = Boolean(p.generationId && p.outputResumeSha === record.sha256);
  return { status: p.status || 'unprepared', phase: p.phase || '', error: p.error || '', revision: p.revision || 0,
    sourceHash: p.sourceSha || record?.sha256 || '', attempts: p.attempts || 0,
    retryable: ['unprepared', 'failed'].includes(p.status || 'unprepared'),
    hasPdf: valid, hasLatex: valid, pageCount: valid ? p.pageCount || null : null, generatedAt: p.generatedAt || null };
}
export function resumeMetadata(record) {
  return record ? { filename: record.filename, extension: record.extension, mimeType: record.mimeType,
    size: record.size, sha256: record.sha256, uploadedAt: record.uploadedAt, preparation: preparationMetadata(record) } : null;
}
export function requirePreparedResume(record) {
  const p = record?.preparation;
  if (!p?.generationId || p.outputResumeSha !== record.sha256 || activeResumeStatuses.includes(p.status)) {
    throw tailoringError('Prepare your resume before creating a job-specific version. Resume preparation is a separate step.', 409);
  }
  return p;
}

export async function requestResumePreparation(user, { regenerate = false, automatic = false, expectedSourceSha, dispatch = dispatchTailoredResumes } = {}) {
  const filter = ownerFilter(user._id);
  const current = await Resume.findOne(filter).lean();
  if (!current) throw tailoringError('Upload your resume before preparing it.', 409);
  if (!await User.exists(activeResumeOwner(user._id))) throw tailoringError('This account is unavailable.', 409);
  if (expectedSourceSha && current.sha256 !== expectedSourceSha) return resumeMetadata(current);
  const p = current.preparation || {};
  if (activeResumeStatuses.includes(p.status) || (!regenerate && p.status === 'completed' && preparationMetadata(current).hasPdf)) return resumeMetadata(current);
  if (!automatic && dispatch === dispatchTailoredResumes) requireTailoredResumeActions();
  const revisionFilter = p.revision === undefined ? { $or: [{ 'preparation.revision': { $exists: false } }, { 'preparation.revision': 0 }] } : { 'preparation.revision': p.revision };
  const row = await Resume.findOneAndUpdate({ ...filter, sha256: current.sha256, ...revisionFilter,
    'preparation.status': { $nin: activeResumeStatuses } }, {
    $set: { 'preparation.status': 'queued', 'preparation.phase': 'queued', 'preparation.error': '', 'preparation.ready': true,
      'preparation.sourceSha': current.sha256, 'preparation.attempts': 0, 'preparation.requestedAt': new Date() },
    $inc: { 'preparation.revision': 1 }, $unset: { 'preparation.leaseOwner': 1, 'preparation.leaseUntil': 1, 'preparation.dispatchAt': 1 },
  }, { new: true, runValidators: true }).lean();
  if (!row) return resumeMetadata(await Resume.findOne(filter).lean());
  const revision = { ...filter, sha256: current.sha256, 'preparation.revision': row.preparation.revision, 'preparation.status': 'queued' };
  // New base requests invalidate queued tailoring immediately; their old PDF is retained.
  await TailoredResume.updateMany({ user: user._id, sourceResumeSha: current.sha256,
    sourceBaseGenerationId: p.generationId ?? null, status: { $in: activeResumeStatuses } }, {
    $set: { status: 'failed', phase: 'failed', ready: false, error: 'Your base resume is being prepared. Generate a new tailored version afterward.' },
    $inc: { revision: 1 }, $unset: { leaseOwner: 1, leaseUntil: 1 },
  });
  try {
    if (!await User.exists(activeResumeOwner(user._id))) throw tailoringError('This account is unavailable.', 409);
    await dispatch();
    await Resume.updateOne(revision, { $set: { 'preparation.dispatchAt': new Date() } });
  } catch (error) {
    await Resume.updateOne(revision, { $set: { 'preparation.status': 'failed', 'preparation.phase': 'failed', 'preparation.ready': false,
      'preparation.error': error.statusCode ? error.message : 'Resume preparation could not start. Please retry.' } });
    if (!automatic) throw error.statusCode ? error : tailoringError('Resume preparation could not start. Please retry.', 503);
  }
  return resumeMetadata(await Resume.findOne(filter).lean());
}

async function preparationSource(row, { withData = false } = {}) {
  if (!await User.exists(activeResumeOwner(row.user))) throw tailoringError('This account is unavailable.', 409);
  const source = await Resume.findOne({ ...ownerFilter(row.user), sha256: row.preparation.sourceSha,
    'preparation.revision': row.preparation.revision, 'preparation.leaseOwner': row.preparation.leaseOwner,
    'preparation.status': 'running', 'preparation.leaseUntil': { $gt: new Date() } }).select(withData ? '+data' : '-data').lean();
  if (!source) throw tailoringError('Your resume changed. Prepare the current version.', 409);
  return source;
}

export async function drainResumePreparations({ generate, deadline = Date.now() + 30 * 60000 } = {}) {
  const counts = { attempted: 0, completed: 0, failed: 0 };
  if (deadline - Date.now() <= 15000) return counts;
  const now = new Date(); const leaseOwner = randomUUID();
  const row = await Resume.findOneAndUpdate({ 'preparation.ready': true, 'preparation.attempts': { $lt: 3 }, $or: [
    { 'preparation.status': 'queued' }, { 'preparation.status': 'running', 'preparation.leaseUntil': { $lt: now } },
  ] }, { $set: { 'preparation.status': 'running', 'preparation.phase': 'extracting', 'preparation.leaseOwner': leaseOwner,
    'preparation.leaseUntil': new Date(Math.max(deadline, now.getTime() + 30 * 60000)) }, $inc: { 'preparation.attempts': 1 } }, { new: true, sort: { 'preparation.requestedAt': 1 } }).select('+preparation.leaseOwner').lean();
  if (!row) return counts;
  counts.attempted = 1;
  const lease = { ...ownerFilter(row.user), sha256: row.preparation.sourceSha, 'preparation.revision': row.preparation.revision,
    'preparation.status': 'running', 'preparation.leaseOwner': leaseOwner, 'preparation.leaseUntil': { $gt: new Date() } };
  let artifact; let published = false;
  try {
    const source = await preparationSource(row, { withData: true });
    const { extractResumeSource } = await import('./resumeSource.js');
    const document = await extractResumeSource({ extension: source.extension, data: artifactBytes(source.data) });
    const output = await generate({ mode: 'base', source: document }, { deadline, onPhase: async phase => {
      await Resume.updateOne({ ...lease, 'preparation.leaseUntil': { $gt: new Date() } }, { $set: { 'preparation.phase': String(phase).slice(0, 100) } });
    } });
    if (Date.now() >= deadline) throw tailoringError('Resume preparation exceeded its time budget. Please retry.', 504);
    await preparationSource(row);
    artifact = await createResumeArtifact({ user: row.user, kind: 'base', sourceResumeSha: row.preparation.sourceSha }, output);
    await preparationSource(row);
    const completed = await Resume.updateOne({ ...lease, 'preparation.leaseUntil': { $gt: new Date() } }, {
      $set: { 'preparation.status': 'completed', 'preparation.phase': 'completed', 'preparation.ready': false, 'preparation.error': '',
        'preparation.generationId': artifact._id, 'preparation.outputResumeSha': row.preparation.sourceSha,
        'preparation.pageCount': artifact.pageCount, 'preparation.modelVersion': artifact.modelVersion, 'preparation.styleVersion': artifact.styleVersion,
        'preparation.generatedAt': new Date() }, $unset: { 'preparation.leaseOwner': 1, 'preparation.leaseUntil': 1 },
    });
    if (!completed.modifiedCount) throw tailoringError('This preparation request changed. Please retry.', 409);
    published = true;
    if (!await User.exists(activeResumeOwner(row.user))) {
      await Resume.deleteOne(ownerFilter(row.user));
      throw tailoringError('This account is unavailable.', 409);
    }
    const afterPublish = await Resume.findOne({ ...ownerFilter(row.user), sha256: row.preparation.sourceSha }).lean();
    if (!afterPublish) throw tailoringError('Your resume changed. Prepare the current version.', 409);
    counts.completed = 1;
  } catch (error) {
    counts.failed = 1;
    const failure = { 'preparation.status': 'failed', 'preparation.phase': 'failed', 'preparation.ready': false,
      'preparation.error': error.statusCode ? error.message : 'Resume preparation was interrupted or returned an invalid document. Please retry.' };
    if (published) {
      const outputKeys = ['generationId', 'outputResumeSha', 'pageCount', 'generatedAt', 'modelVersion', 'styleVersion'];
      const previous = Object.fromEntries(outputKeys.filter(key => row.preparation[key] !== undefined).map(key => [`preparation.${key}`, row.preparation[key]]));
      const absent = Object.fromEntries(outputKeys.filter(key => row.preparation[key] === undefined).map(key => [`preparation.${key}`, 1]));
      await Resume.updateOne({ ...ownerFilter(row.user), 'preparation.revision': row.preparation.revision, 'preparation.generationId': artifact._id }, {
        $set: { ...previous, ...failure }, $unset: absent,
      });
      // A concurrent retry can retain this successful generation under a newer
      // revision. An older worker must not remove bytes it still references.
      if (!await Resume.exists({ user: row.user, 'preparation.generationId': artifact._id })) await deleteResumeArtifact(row.user, artifact._id);
    } else {
      await deleteResumeArtifact(row.user, artifact?._id);
      await Resume.updateOne({ ...lease, 'preparation.leaseUntil': { $gt: new Date() } }, { $set: failure,
        $unset: { 'preparation.leaseOwner': 1, 'preparation.leaseUntil': 1 } });
    }
  }
  // Cleanup cannot revoke an output that has already been published successfully.
  if (counts.completed) await deleteResumeArtifact(row.user, row.preparation.generationId).catch(() => {});
  return counts;
}

export async function getBaseResumeArtifact(user) {
  const row = await Resume.findOne(ownerFilter(user._id)).lean();
  if (!row || !preparationMetadata(row).hasPdf) throw tailoringError('Prepare your resume before downloading the generated version.', 404);
  const artifact = await readResumeArtifact(user._id, row.preparation.generationId, { kind: 'base' });
  if (!artifact || artifact.sourceResumeSha !== row.sha256) throw tailoringError('Prepare your current resume again.', 409);
  return { artifact, filename: row.filename };
}

export async function recoverResumePreparations({ now = new Date(), dispatch = dispatchTailoredResumes, dispatchPending = true } = {}) {
  await Resume.updateMany({ 'preparation.status': { $in: activeResumeStatuses }, $or: [
    { 'preparation.requestedAt': { $lt: new Date(now.getTime() - 86400000) } },
    { 'preparation.status': 'running', 'preparation.attempts': { $gte: 3 }, 'preparation.leaseUntil': { $lt: now } },
  ] }, { $set: { 'preparation.status': 'failed', 'preparation.phase': 'failed', 'preparation.ready': false,
    'preparation.error': 'This preparation request was interrupted. Please retry.' }, $unset: { 'preparation.leaseOwner': 1, 'preparation.leaseUntil': 1 } });
  await Resume.updateMany({ 'preparation.status': 'running', 'preparation.attempts': { $lt: 3 }, 'preparation.leaseUntil': { $lt: now } }, {
    $set: { 'preparation.status': 'queued', 'preparation.phase': 'queued' }, $unset: { 'preparation.leaseOwner': 1, 'preparation.leaseUntil': 1 },
  });
  const due = { 'preparation.status': 'queued', 'preparation.ready': true, $or: [
    { 'preparation.dispatchAt': { $exists: false } }, { 'preparation.dispatchAt': { $lt: new Date(now.getTime() - 300000) } },
  ] };
  const pending = Boolean(await Resume.exists(due));
  if (pending && dispatchPending && (dispatch !== dispatchTailoredResumes || tailoredResumeActionsConfigured())) {
    try { await dispatch(); await Resume.updateMany(due, { $set: { 'preparation.dispatchAt': now } }); } catch { /* Keep durable queued work for recovery. */ }
  }
  return { pending, due };
}
