import { createHash, randomUUID } from 'node:crypto';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import TailoredResume from '../models/TailoredResume.js';
import SiteSettings from '../models/SiteSettings.js';
import { applyPublicJobVisibility } from '../utils/publicJobVisibility.js';
import { dispatchTailoredResumes, tailoredResumeActionsConfigured, requireTailoredResumeActions } from './resumeTailoringWorkflow.js';
import { dayKey, reserveUsage } from './outreachUsage.js';
import { extractResumeText } from './resumeText.js';
import { tailoringError, validateTailoredResume } from './resumeTailoringContent.js';

const activeOwner = user => ({ _id: user, deactivated: { $ne: true }, outreachDeletingAt: null });
const recordId = (user, job) => `${user}:${job}`;
const jobHash = job => createHash('sha256').update(JSON.stringify([job.title, job.company, job.sourceDescription || job.description || ''])).digest('hex');
const activeStatuses = ['queued', 'running'];

async function context(user, jobId, { settings = {}, requireResume = false, withData = false } = {}) {
  if (!/^[a-f0-9]{24}$/i.test(String(jobId || ''))) throw tailoringError('Invalid job ID.');
  const owner = await User.findOne(activeOwner(user._id)).select('savedJobs').lean();
  if (!owner) throw tailoringError('This account is unavailable.', 409);
  if (!owner.savedJobs?.some(id => String(id) === String(jobId))) throw tailoringError('Saved job not found. Bookmark this job first.', 404);
  const [job, resume] = await Promise.all([
    Job.findOne(applyPublicJobVisibility({ _id: jobId, status: 'active' }, settings || {})).lean(),
    Resume.findOne({ _id: owner._id, user: owner._id }).select(withData ? '+data' : '-data').lean(),
  ]);
  if (!job) throw tailoringError('This saved job is no longer available.', 404);
  if (requireResume && !resume) throw tailoringError('Upload your resume before creating a tailored resume.', 409);
  return { job, resume, hash: jobHash(job) };
}

function publicRecord(row, source) {
  if (!row) return null;
  return { id: row._id, jobId: String(row.job), status: row.status, error: row.error || '',
    stale: Boolean(row.output && (row.outputResumeSha !== source.resume?.sha256 || row.outputJobHash !== source.hash)),
    output: row.output || null, generatedAt: row.generatedAt || null, sourceFilename: source.resume?.filename || '', updatedAt: row.updatedAt };
}

export async function getTailoredResume(user, jobId, settings) {
  const source = await context(user, jobId, { settings });
  return publicRecord(await TailoredResume.findById(recordId(user._id, jobId)).lean(), source);
}

export async function requestTailoredResume(user, jobId, { regenerate = false, settings, dispatch = dispatchTailoredResumes } = {}) {
  const source = await context(user, jobId, { settings, requireResume: true });
  const id = recordId(user._id, jobId);
  const current = await TailoredResume.findById(id).lean();
  const view = publicRecord(current, source);
  if (current && activeStatuses.includes(current.status)) return view;
  if (current?.output && !view.stale && !regenerate) return view;
  if (dispatch === dispatchTailoredResumes) requireTailoredResumeActions();
  let row;
  try {
    row = await TailoredResume.findOneAndUpdate({ _id: id, status: { $nin: activeStatuses } }, {
      $set: { status: 'queued', ready: false, sourceResumeSha: source.resume.sha256, sourceJobHash: source.hash, error: '', attempts: 0, requestedAt: new Date() },
      $setOnInsert: { user: user._id, job: jobId }, $inc: { revision: 1 }, $unset: { leaseOwner: 1, leaseUntil: 1, dispatchAt: 1 },
    }, { upsert: true, new: true, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return publicRecord(await TailoredResume.findById(id).lean(), source);
  }
  const revision = { _id: id, revision: row.revision, status: 'queued' };
  try {
    await reserveUsage(`user:${user._id}:tailored-resumes:${dayKey()}`, 10, { user: user._id });
    const fresh = await context(user, jobId, { settings, requireResume: true });
    if (fresh.resume.sha256 !== source.resume.sha256 || fresh.hash !== source.hash) throw tailoringError('Your resume or this job changed. Please retry.', 409);
    const ready = await TailoredResume.updateOne(revision, { $set: { ready: true } });
    if (!ready.matchedCount) throw tailoringError('This request changed. Please retry.', 409);
    await dispatch();
    await TailoredResume.updateOne(revision, { $set: { dispatchAt: new Date() } });
  } catch (error) {
    const message = error.statusCode ? error.message : 'AI generation could not start. Please retry.';
    await TailoredResume.updateOne(revision, { $set: { status: 'failed', ready: false, error: message } });
    if (!await User.exists(activeOwner(user._id))) await TailoredResume.deleteOne({ _id: id });
    throw error.statusCode ? error : tailoringError(message, 503);
  }
  return publicRecord(await TailoredResume.findById(id).lean(), source);
}

export async function drainTailoredResumes({ generate, maxTasks = 1, deadline = Date.now() + 360000 } = {}) {
  const counts = { attempted: 0, completed: 0, failed: 0 };
  const settings = await SiteSettings.findOne().lean();
  while (counts.attempted < Math.min(3, maxTasks) && deadline - Date.now() > 15000) {
    const now = new Date();
    const leaseOwner = randomUUID();
    const row = await TailoredResume.findOneAndUpdate({ ready: true, attempts: { $lt: 3 },
      $or: [{ status: 'queued' }, { status: 'running', leaseUntil: { $lt: now } }] }, {
      $set: { status: 'running', leaseOwner, leaseUntil: new Date(Math.min(deadline, now.getTime() + 180000)) }, $inc: { attempts: 1 },
    }, { new: true, sort: { updatedAt: 1 } }).select('+leaseOwner').lean();
    if (!row) break;
    counts.attempted++;
    const lease = { _id: row._id, revision: row.revision, status: 'running', leaseOwner };
    try {
      const source = await context({ _id: row.user }, row.job, { settings, requireResume: true, withData: true });
      if (source.resume.sha256 !== row.sourceResumeSha || source.hash !== row.sourceJobHash) throw tailoringError('Your resume or this job changed. Generate a new version.', 409);
      const bytes = Buffer.isBuffer(source.resume.data) ? source.resume.data : source.resume.data?.buffer;
      const resumeText = await extractResumeText({ extension: source.resume.extension, data: bytes });
      const output = validateTailoredResume(await generate({ resumeText, job: source.job }, { remainingMs: deadline - Date.now() }));
      const fresh = await context({ _id: row.user }, row.job, { settings, requireResume: true });
      if (fresh.resume.sha256 !== row.sourceResumeSha || fresh.hash !== row.sourceJobHash) throw tailoringError('Your resume or this job changed. Generate a new version.', 409);
      const completed = await TailoredResume.updateOne({ ...lease, leaseUntil: { $gt: new Date() } }, {
        $set: { status: 'completed', ready: false, output, outputResumeSha: row.sourceResumeSha, outputJobHash: row.sourceJobHash, error: '', generatedAt: new Date() }, $unset: { leaseOwner: 1, leaseUntil: 1 },
      });
      if (completed.modifiedCount) counts.completed++; else counts.failed++;
    } catch (error) {
      counts.failed++;
      await TailoredResume.updateOne({ ...lease, leaseUntil: { $gt: new Date() } }, { $set: { status: 'failed', ready: false,
        error: error.statusCode ? error.message : 'AI generation was interrupted or returned an invalid resume. Please retry.' }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
      if (!await User.exists(activeOwner(row.user))) await TailoredResume.deleteOne({ _id: row._id });
    }
  }
  return counts;
}

let recovering = false;
export async function recoverTailoredResumes({ dispatch = dispatchTailoredResumes, now = new Date() } = {}) {
  if (recovering) return;
  recovering = true;
  try {
    await TailoredResume.updateMany({ status: { $in: activeStatuses }, $or: [
      { requestedAt: { $lt: new Date(now.getTime() - 86400000) } },
      { requestedAt: { $exists: false }, createdAt: { $lt: new Date(now.getTime() - 86400000) } },
      { status: 'running', attempts: { $gte: 3 }, leaseUntil: { $lt: now } },
      { status: 'queued', ready: false, updatedAt: { $lt: new Date(now.getTime() - 60000) } },
    ] }, { $set: { status: 'failed', ready: false, error: 'This request was interrupted. Please retry generation.' }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
    if (dispatch === dispatchTailoredResumes && !tailoredResumeActionsConfigured()) return;
    await TailoredResume.updateMany({ status: 'running', attempts: { $lt: 3 }, leaseUntil: { $lt: now } }, { $set: { status: 'queued' }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
    const due = { status: 'queued', ready: true, $or: [{ dispatchAt: { $exists: false } }, { dispatchAt: { $lt: new Date(now.getTime() - 300000) } }] };
    if (await TailoredResume.exists(due)) {
      try { await dispatch(); await TailoredResume.updateMany(due, { $set: { dispatchAt: now } }); }
      catch { /* Durable requests remain retryable when the shared worker is unavailable. */ }
    }
  } finally { recovering = false; }
}
