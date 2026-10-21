import { createHash, randomUUID } from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import Job from '../models/Job.js';
import User from '../models/User.js';
import OutreachTask from '../models/OutreachTask.js';
import OutreachThread, { OUTREACH_STATUSES } from '../models/OutreachThread.js';
import OutreachDiscoveryCache from '../models/OutreachDiscoveryCache.js';
import OutreachEmailCache from '../models/OutreachEmailCache.js';
import OutreachUsage from '../models/OutreachUsage.js';
import Campaign from '../models/Campaign.js';
import { buildJobContext, discoveryProvider, jobSnapshot, groundedContacts, searchTavily, findHunterEmail } from './outreachProviders.js';
import { dayKey, monthKey, outreachError, reserveUsage } from './outreachUsage.js';
import { githubRequest } from '../pipeline/github.js';
import { applyPublicJobVisibility } from '../utils/publicJobVisibility.js';

const DAY = 86400000;
const validId = value => typeof value === 'string' && isValidObjectId(value);
const assertId = value => { if (!validId(String(value || ''))) throw outreachError('A valid record ID is required.'); };
export const publicTask = task => {
  const source = task?.toObject ? task.toObject() : task;
  return Object.fromEntries(['_id', 'user', 'job', 'thread', 'kind', 'status', 'result', 'error', 'createdAt', 'updatedAt', 'completedAt'].filter(key => source?.[key] !== undefined).map(key => [key, source[key]]));
};
const terminalUpdate = (status, result = null, error = '') => ({ $set: { status, result, error, completedAt: new Date() }, $unset: { activeKey: 1, leaseOwner: 1, leaseUntil: 1 } });
const bounded = (value, limit) => typeof value === 'string' && value.length <= limit;
async function requireOwner(user) {
  if (!await User.exists({ _id: user, deactivated: { $ne: true }, outreachDeletingAt: null })) throw outreachError('Your account is unavailable for outreach.', 403);
}
async function requireTaskOwner(task) {
  try { await requireOwner(task.user); }
  catch (error) {
    await OutreachTask.deleteOne({ _id: task._id, user: task.user });
    await OutreachUsage.deleteMany({ user: task.user });
    throw error;
  }
}
const tickDiscovery = id => { setImmediate(() => processDiscoveryTask(id).catch(() => {})); };
async function completeDiscovery(task, owner, result) {
  const saved = await OutreachTask.updateOne({ _id: task._id, user: task.user, status: 'running', leaseOwner: owner,
    $expr: { $gt: ['$leaseUntil', '$$NOW'] },
  }, terminalUpdate('completed', result));
  if (!saved.matchedCount) return false;
  try { await requireOwner(task.user); }
  catch { await OutreachTask.deleteOne({ _id: task._id, user: task.user }); return false; }
  return true;
}

export async function requestDiscovery(user, { jobId, refresh = false }, { schedule = tickDiscovery, dispatch = dispatchOutreachDiscoveries, now = new Date(), siteSettings = {} } = {}) {
  assertId(jobId);
  if (typeof refresh !== 'boolean') throw outreachError('Refresh must be a boolean.');
  await requireOwner(user);
  const job = await Job.findOne(applyPublicJobVisibility({ _id: jobId, status: 'active', $or: [{ closingDate: null }, { closingDate: { $gt: now } }] }, siteSettings)).lean();
  if (!job) throw outreachError('This job is no longer available.', 404);
  const provider = discoveryProvider();
  const context = buildJobContext(job, { provider });
  const activeKey = `${user}:discovery:${jobId}:${context.contextHash}`;
  const active = await OutreachTask.findOne({ user, activeKey });
  if (active) return publicTask(active);
  const cached = !refresh && await OutreachDiscoveryCache.findOne({ contextHash: context.contextHash, expiresAt: { $gt: now } }).lean();
  if (cached) {
    const task = await OutreachTask.create({ user, job: jobId, kind: 'discovery', status: 'completed', result: { contacts: cached.contacts, jobSnapshot: jobSnapshot(context) }, completedAt: now });
    await requireTaskOwner(task);
    return publicTask(task);
  }
  if (provider === 'tavily' && !process.env.TAVILY_API_KEY) throw outreachError('Referral search is not configured yet.', 503);
  if (provider === 'actions') requireOutreachActions('Referral discovery');
  let task;
  try { task = await OutreachTask.create({ user, job: jobId, kind: 'discovery', activeKey, input: { provider, context, refresh } }); }
  catch (error) { if (error.code !== 11000) throw error; return publicTask(await OutreachTask.findOne({ user, activeKey })); }
  try {
    await reserveUsage(`user:${user}:discoveries:${dayKey(now)}`, 5, { user, now });
    await OutreachTask.updateOne({ _id: task._id, status: 'queued' }, { $set: { ready: true } });
    await requireTaskOwner(task);
    if (provider === 'actions') {
      try {
        await dispatch();
        await OutreachTask.updateOne({ _id: task._id, status: 'queued' }, { $set: { dispatchAt: now } });
      } catch (error) {
        const message = error.statusCode ? error.message : 'Referral discovery could not be dispatched. Please retry.';
        const changed = await OutreachTask.updateOne({ _id: task._id, status: 'queued', attempts: task.attempts || 0 }, terminalUpdate('failed', null, message));
        if (changed.matchedCount) { task.status = 'failed'; task.error = message; }
        else {
          const current = await OutreachTask.findById(task._id).lean();
          if (!current) throw outreachError('This referral request is no longer available.', 404);
          return publicTask(current);
        }
      }
    } else schedule(task._id);
  } catch (error) {
    await OutreachTask.updateOne({ _id: task._id, status: 'queued', attempts: task.attempts || 0 }, terminalUpdate('failed', null, error.statusCode ? error.message : 'Referral discovery was interrupted. Please retry.'));
    throw error;
  }
  return publicTask(task);
}

/** Called only for an explicit, persisted request, including recovery of interrupted requests. */
export async function processDiscoveryTask(id, { provider = 'tavily', search = searchTavily, rankContacts, findEmail = findHunterEmail, now = new Date(), deadline = Date.now() + 150000 } = {}) {
  if (provider === 'actions' && (search === searchTavily || typeof rankContacts !== 'function')) throw outreachError('Referral discovery requires its Actions search and ranking worker.', 503);
  const owner = randomUUID();
  const task = await OutreachTask.findOneAndUpdate({ _id: id, kind: 'discovery', 'input.provider': provider === 'actions' ? 'actions' : { $ne: 'actions' }, ready: true, attempts: { $lt: 3 }, $or: [{ status: 'queued' }, { status: 'running', leaseUntil: { $lt: now } }] }, { $set: { status: 'running', leaseOwner: owner, leaseUntil: new Date(now.getTime() + 3 * 60000) }, $inc: { attempts: 1 } }, { new: true }).select('+input +leaseOwner').lean();
  if (!task) return null;
  let cacheLocked = false;
  const hash = task.input.context.contextHash;
  try {
    if (!await User.exists({ _id: task.user, deactivated: { $ne: true }, outreachDeletingAt: null })) { await OutreachTask.deleteOne({ _id: task._id, user: task.user }); return null; }
    const context = task.input.context;
    const cache = await OutreachDiscoveryCache.findOne({ contextHash: hash, expiresAt: { $gt: now } }).lean();
    if (cache && !task.input.refresh) {
      const result = { contacts: cache.contacts, jobSnapshot: jobSnapshot(context) };
      return await completeDiscovery(task, owner, result) ? result : null;
    }
    try { await OutreachDiscoveryCache.updateOne({ contextHash: hash }, { $setOnInsert: { contacts: [] } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
    const lock = await OutreachDiscoveryCache.findOneAndUpdate({ contextHash: hash, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }] }, { $set: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + 3 * 60000) } }, { new: true });
    if (!lock) {
      await OutreachTask.updateOne({ _id: task._id, leaseOwner: owner }, { $set: { status: 'queued' }, $unset: { leaseOwner: 1, leaseUntil: 1 }, $inc: { attempts: -1 } });
      return null;
    }
    cacheLocked = true;
    await reserveUsage(`provider:${provider === 'actions' ? 'searxng' : 'tavily'}:${monthKey(now)}`, 1000, { now });
    const searchResults = await search(context, { deadline });
    const candidates = groundedContacts(searchResults, context, { limit: provider === 'actions' ? 12 : 3 });
    const contacts = rankContacts ? await rankContacts(context, candidates, { deadline }) : candidates;
    if (!Array.isArray(contacts) || contacts.length > 3 || contacts.some(contact => !candidates.includes(contact))) throw outreachError('Referral ranking returned unsupported contacts. Please retry.', 502);
    if (!contacts.length && searchResults.incomplete) throw outreachError('Public search engines are unavailable or blocked. Please retry later.', 502);
    if (!await User.exists({ _id: task.user, deactivated: { $ne: true }, outreachDeletingAt: null })) { await OutreachTask.deleteOne({ _id: task._id, user: task.user }); return null; }
    for (const contact of contacts) {
      if (!context.companyDomain || deadline - Date.now() <= 1000) continue;
      const key = createHash('sha256').update(`${context.companyDomain}:${contact.name.toLocaleLowerCase()}`).digest('hex');
      const cachedEmail = await OutreachEmailCache.findOne({ key, expiresAt: { $gt: now } }).lean();
      if (cachedEmail) { Object.assign(contact, { email: cachedEmail.email, emailStatus: cachedEmail.emailStatus }); continue; }
      if (!process.env.HUNTER_API_KEY && findEmail === findHunterEmail) continue;
      try {
        await reserveUsage(`provider:hunter:${monthKey(now)}`, 50, { now });
        const result = await findEmail(contact, context.companyDomain, { remainingMs: deadline - Date.now() });
        Object.assign(contact, result);
        await OutreachEmailCache.updateOne({ key }, { $set: { ...result, expiresAt: new Date(now.getTime() + 30 * DAY) } }, { upsert: true });
      } catch { /* Contacts are still useful when email lookup or its budget is unavailable. */ }
    }
    const result = { contacts, jobSnapshot: jobSnapshot(context) };
    if (!await completeDiscovery(task, owner, result)) return null;
    // Public evidence can outlive its requesting account. Publish it only after
    // the private task commits, and only while this worker owns the cache lease.
    const published = await OutreachDiscoveryCache.updateOne({ contextHash: hash, leaseOwner: owner, $expr: { $gt: ['$leaseUntil', '$$NOW'] } },
      { $set: { ...result, expiresAt: new Date(now.getTime() + 7 * DAY) }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
    if (published.matchedCount) cacheLocked = false;
    return result;
  } catch (error) {
    const message = error.statusCode ? error.message : 'Discovery was interrupted. Please retry.';
    await OutreachTask.updateOne({ _id: task._id, status: 'running', leaseOwner: owner, $expr: { $gt: ['$leaseUntil', '$$NOW'] } }, terminalUpdate('failed', null, message));
    return null;
  } finally {
    if (cacheLocked) await OutreachDiscoveryCache.updateOne({ contextHash: hash, leaseOwner: owner }, { $unset: { leaseOwner: 1, leaseUntil: 1 } });
  }
}

export async function getTask(user, id) {
  assertId(id);
  const task = await OutreachTask.findOne({ _id: id, user }).lean();
  if (!task) throw outreachError('Outreach request not found.', 404);
  return publicTask(task);
}
export async function saveContact(user, { taskId, contactIndex }) {
  assertId(taskId);
  await requireOwner(user);
  if (!Number.isInteger(contactIndex) || contactIndex < 0 || contactIndex > 2) throw outreachError('Select a valid contact.');
  const task = await OutreachTask.findOne({ _id: taskId, user, kind: 'discovery', status: 'completed' }).lean();
  const contact = task?.result?.contacts?.[contactIndex];
  if (!contact) throw outreachError('Contact not found in your completed discovery.', 404);
  const contactKey = createHash('sha256').update(`${contact.name.toLocaleLowerCase()}:${task.result.jobSnapshot.companyDomain}`).digest('hex');
  const filter = { user, job: task.job, contactKey };
  let saved;
  try { saved = await OutreachThread.findOneAndUpdate(filter, { $setOnInsert: { ...filter, contact, jobSnapshot: task.result.jobSnapshot, status: 'saved', revision: 0 } }, { upsert: true, new: true, runValidators: true }); }
  catch (error) { if (error.code !== 11000) throw error; saved = await OutreachThread.findOne(filter); }
  try { await requireOwner(user); }
  catch (error) { if (saved) await OutreachThread.deleteOne({ _id: saved._id, user }); throw error; }
  return saved;
}
export async function listThreads(user, filters = {}) {
  const where = { user };
  if (filters.jobId) { assertId(filters.jobId); where.job = filters.jobId; }
  if (filters.status) {
    if (!OUTREACH_STATUSES.includes(filters.status)) throw outreachError('Invalid outreach status.');
    where.status = filters.status;
  }
  if (filters.company) {
    if (!bounded(filters.company, 500)) throw outreachError('Invalid company filter.');
    where['jobSnapshot.company'] = { $regex: filters.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  const threads = await OutreachThread.find(where).sort({ updatedAt: -1 }).limit(250).lean();
  if (!threads.length) return [];
  const latestTasks = await OutreachTask.find({ user, kind: 'draft', thread: { $in: threads.map(thread => thread._id) } }).sort({ createdAt: -1 }).select('_id thread status error').lean();
  const tasks = new Map();
  for (const task of latestTasks) if (!tasks.has(String(task.thread))) tasks.set(String(task.thread), { _id: task._id, status: task.status, error: task.error });
  return threads.map(thread => ({ ...thread, draftTask: tasks.get(String(thread._id)) || null }));
}
export function fourWeekdaysAfter(date) {
  const result = new Date(date);
  for (let days = 0; days < 4;) { result.setUTCDate(result.getUTCDate() + 1); if (![0, 6].includes(result.getUTCDay())) days++; }
  return result;
}
export async function updateThread(user, id, patch) {
  assertId(id);
  await requireOwner(user);
  const thread = await OutreachThread.findOne({ _id: id, user }).lean();
  if (!thread) throw outreachError('Outreach record not found.', 404);
  if (patch.revision !== undefined && patch.revision !== thread.revision) throw outreachError('This outreach record changed. Refresh before editing again.', 409);
  const set = {};
  if (patch.draft !== undefined) {
    if (!patch.draft || typeof patch.draft !== 'object' || Array.isArray(patch.draft)) throw outreachError('Invalid draft.');
    for (const [key, limit] of Object.entries({ linkedin: 3000, emailSubject: 250, emailBody: 12000 })) {
      if (patch.draft[key] === undefined) continue;
      if (!bounded(patch.draft[key], limit) || /\0/.test(patch.draft[key]) || key === 'emailSubject' && /[\r\n]/.test(patch.draft[key])) throw outreachError('Invalid draft text.');
      set[`draft.${key}`] = patch.draft[key];
    }
    if (thread.status === 'saved') set.status = 'drafted';
  }
  if (patch.status !== undefined) {
    if (!OUTREACH_STATUSES.includes(patch.status)) throw outreachError('Invalid outreach status.');
    set.status = patch.status;
    if (patch.status === 'sent' && !thread.lastSentAt) { set.lastSentAt = new Date(); set.followUpAt = fourWeekdaysAfter(set.lastSentAt); }
  }
  if (patch.followUpAt !== undefined) {
    const date = patch.followUpAt === null || patch.followUpAt === '' ? null : new Date(patch.followUpAt);
    if (date && !Number.isFinite(date.getTime())) throw outreachError('Invalid follow-up date.');
    set.followUpAt = date;
  }
  if (patch.email !== undefined) {
    if (!bounded(patch.email, 320) || patch.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(patch.email)) throw outreachError('Enter a valid email address.');
    set['contact.email'] = patch.email.toLowerCase().trim();
    if (set['contact.email'] !== thread.contact.email) { set['contact.emailStatus'] = patch.email ? 'unverified' : 'unavailable'; set['contact.emailConfirmed'] = false; }
  }
  if (patch.emailConfirmed !== undefined) {
    if (typeof patch.emailConfirmed !== 'boolean') throw outreachError('Email confirmation must be a boolean.');
    if (patch.emailConfirmed && !(patch.email ?? thread.contact.email)) throw outreachError('An email address is required before confirming it.');
    set['contact.emailConfirmed'] = patch.emailConfirmed;
  }
  if (!Object.keys(set).length) throw outreachError('No editable fields supplied.');
  const updated = await OutreachThread.findOneAndUpdate({ _id: id, user, revision: thread.revision }, { $set: set, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!updated) throw outreachError('This outreach record changed. Refresh before editing again.', 409);
  return updated;
}
export async function deleteThread(user, id) {
  assertId(id);
  const result = await OutreachThread.deleteOne({ _id: id, user });
  if (!result.deletedCount) throw outreachError('Outreach record not found.', 404);
  await OutreachTask.deleteMany({ user, thread: id });
  const pending = { thread: id, status: { $in: ['draft', 'queued'] } };
  for (const [campaignStatus, itemStatus] of [['draft', 'removed'], [{ $ne: 'draft' }, 'cancelled']]) {
    await Campaign.updateMany({ user, status: campaignStatus, items: { $elemMatch: pending } }, { $set: { 'items.$[pending].status': itemStatus, 'items.$[pending].error': 'Outreach contact was removed before sending.' }, $inc: { revision: 1 } }, { arrayFilters: [{ 'pending.thread': id, 'pending.status': pending.status }] });
  }
}

const outreachDispatches = new Map();

async function dispatchOutreachWorkflow(repo, workflow, request, now) {
  const data = await request(repo, `/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=20`);
  if (!Array.isArray(data?.workflow_runs)) throw outreachError('GitHub returned invalid outreach workflow status.', 502);
  if (data.workflow_runs.some(run => ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status))) return { reused: true };
  const repository = await request(repo, '');
  if (!repository.default_branch) throw outreachError('The outreach workflow default branch is unavailable.', 502);
  // Billing settings are an operator prerequisite. This additional cap bounds this feature's usage.
  const configured = Number(process.env.OUTREACH_ACTIONS_MONTHLY_RUN_LIMIT || 10);
  const cap = Number.isInteger(configured) ? Math.max(0, Math.min(100, configured)) : 0;
  await reserveUsage(`actions:${monthKey(now)}`, cap, { now });
  await request(repo, `/actions/workflows/${workflow}/dispatches`, { method: 'POST', body: { ref: repository.default_branch } });
  return { reused: false };
}

function requireOutreachActions(label) {
  if (process.env.OUTREACH_ACTIONS_ENABLED !== 'true' || process.env.OUTREACH_ACTIONS_FREE_CONFIRMED !== 'true') throw outreachError(`${label} is unavailable until free GitHub Actions capacity is configured.`, 503);
  if (!process.env.GITHUB_PAT || !/^[-\w.]+\/[-\w.]+$/.test(process.env.GITHUB_REPO || '')) throw outreachError(`${label} is unavailable until GitHub repository access is configured.`, 503);
}

async function dispatchRequestedOutreach(workflow, label, { request = githubRequest, now = new Date() } = {}) {
  requireOutreachActions(label);
  const repo = process.env.GITHUB_REPO;
  // GitHub may not list an accepted run immediately. Coalesce concurrent
  // requests so they do not each consume a monthly dispatch reservation.
  const key = `${repo}:${workflow}`;
  if (outreachDispatches.has(key)) return outreachDispatches.get(key);
  const pending = dispatchOutreachWorkflow(repo, workflow, request, now);
  outreachDispatches.set(key, pending);
  try { return await pending; }
  finally { if (outreachDispatches.get(key) === pending) outreachDispatches.delete(key); }
}
export function dispatchOutreachDrafts(options) { return dispatchRequestedOutreach('outreach-drafts.yml', 'AI drafting', options); }
export function dispatchOutreachDiscoveries(options) { return dispatchRequestedOutreach('outreach-discoveries.yml', 'Referral discovery', options); }
export async function requestDraft(user, threadId, { dispatch = dispatchOutreachDrafts, now = new Date() } = {}) {
  assertId(threadId);
  const owner = user._id;
  await requireOwner(owner);
  const thread = await OutreachThread.findOne({ _id: threadId, user: owner }).lean();
  if (!thread) throw outreachError('Outreach record not found.', 404);
  const activeKey = `${owner}:draft:${threadId}`;
  const active = await OutreachTask.findOne({ user: owner, activeKey });
  if (active) return publicTask(active);
  const profile = user.profile || {};
  const job = await Job.findById(thread.job).select('description sourceDescription').lean();
  const input = { revision: thread.revision, jobSnapshot: thread.jobSnapshot, contact: thread.contact, profile: { name: profile.name || '', aboutYou: profile.aboutYou || '', experienceProjects: profile.experienceProjects || '', portfolioUrl: profile.portfolioUrl || '' }, jobDescription: buildJobContext(job || {}).description };
  let task;
  try { task = await OutreachTask.create({ user: owner, job: thread.job, thread: threadId, kind: 'draft', activeKey, input }); }
  catch (error) { if (error.code !== 11000) throw error; return publicTask(await OutreachTask.findOne({ user: owner, activeKey })); }
  try {
    await reserveUsage(`user:${owner}:drafts:${dayKey(now)}`, 10, { user: owner, now });
    await OutreachTask.updateOne({ _id: task._id }, { $set: { ready: true } });
    await requireTaskOwner(task);
    await dispatch();
    await OutreachTask.updateOne({ _id: task._id }, { $set: { dispatchAt: now } });
  } catch (error) {
    const message = error.statusCode ? error.message : 'AI drafting could not be dispatched. Please retry.';
    await OutreachTask.updateOne({ _id: task._id }, terminalUpdate('failed', null, message));
    task.status = 'failed'; task.error = message;
  }
  return publicTask(task);
}

let recovering = false;
export async function recoverOutreachTasks({ dispatchDiscovery = dispatchOutreachDiscoveries, dispatchDraft = dispatchOutreachDrafts, runDiscovery = processDiscoveryTask } = {}) {
  if (recovering) return;
  recovering = true;
  try {
    const now = new Date();
    await OutreachTask.updateMany({ status: { $in: ['queued', 'running'] }, createdAt: { $lt: new Date(now.getTime() - DAY) } }, terminalUpdate('failed', null, 'This request expired before it could finish. Please retry.'));
    await OutreachTask.updateMany({ status: 'running', leaseUntil: { $lt: now }, attempts: { $gte: 3 } }, terminalUpdate('failed', null, 'This request was interrupted repeatedly. Please retry.'));
    const discoveries = await OutreachTask.find({ kind: 'discovery', 'input.provider': { $ne: 'actions' }, ready: true, $or: [{ status: 'queued' }, { status: 'running', leaseUntil: { $lt: now } }] }).limit(3).select('_id').lean();
    for (const task of discoveries) await runDiscovery(task._id);
    if (process.env.OUTREACH_ACTIONS_ENABLED !== 'true' || process.env.OUTREACH_ACTIONS_FREE_CONFIRMED !== 'true') return;
    await OutreachTask.updateMany({ kind: 'discovery', 'input.provider': 'actions', status: 'running', leaseUntil: { $lt: now }, attempts: { $lt: 3 } }, { $set: { status: 'queued' }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
    const discovery = await OutreachTask.findOne({ kind: 'discovery', 'input.provider': 'actions', status: 'queued', ready: true, $or: [{ dispatchAt: { $exists: false } }, { dispatchAt: { $lt: new Date(now.getTime() - 5 * 60000) } }] });
    if (discovery) {
      try { await dispatchDiscovery(); await OutreachTask.updateMany({ kind: 'discovery', 'input.provider': 'actions', status: 'queued', ready: true }, { $set: { dispatchAt: now } }); }
      catch { /* Keep only persisted, explicitly requested discovery jobs retryable. */ }
    }
    await OutreachTask.updateMany({ kind: 'draft', status: 'running', leaseUntil: { $lt: now }, attempts: { $lt: 3 } }, { $set: { status: 'queued' }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
    const task = await OutreachTask.findOne({ kind: 'draft', status: 'queued', ready: true, $or: [{ dispatchAt: { $exists: false } }, { dispatchAt: { $lt: new Date(now.getTime() - 5 * 60000) } }] });
    if (task) {
      try { await dispatchDraft(); await OutreachTask.updateMany({ kind: 'draft', status: 'queued', ready: true }, { $set: { dispatchAt: now } }); }
      catch { /* A bounded, persisted request stays retryable while Actions is unavailable. */ }
    }
  } finally { recovering = false; }
}
