import { createHash, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import GmailConnection from '../models/GmailConnection.js';
import GmailOAuthState from '../models/GmailOAuthState.js';
import OutreachThread from '../models/OutreachThread.js';
import User from '../models/User.js';
import { APIError } from '../middleware/errorHandler.js';
import { buildRawMessage, classifyGmailFailure, disconnectGmail, sendGmailMessage, validEmail } from './gmailService.js';

const SPACING_MS = 3 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export function addWeekdays(value, weekdays = 4) {
  const indiaOffsetMs = 330 * 60 * 1000;
  const result = new Date(new Date(value).getTime() + indiaOffsetMs);
  for (let count = 0; count < weekdays;) { result.setUTCDate(result.getUTCDate() + 1); if (![0, 6].includes(result.getUTCDay())) count++; }
  return new Date(result.getTime() - indiaOffsetMs);
}

export function threadSnapshotHash(thread) {
  return createHash('sha256').update(JSON.stringify({ revision: thread.revision ?? 0,
    contact: { name: thread.contact?.name, email: thread.contact?.email, emailStatus: thread.contact?.emailStatus, emailConfirmed: thread.contact?.emailConfirmed },
    draft: { emailSubject: thread.draft?.emailSubject, emailBody: thread.draft?.emailBody },
    job: { title: thread.jobSnapshot?.title, company: thread.jobSnapshot?.company, companyDomain: thread.jobSnapshot?.companyDomain, jobUrl: thread.jobSnapshot?.jobUrl },
  })).digest('hex');
}

function validId(id) { if (!mongoose.isObjectIdOrHexString(id)) throw new APIError(400, 'Invalid campaign or outreach ID.'); }

export function serializeCampaign(campaign) {
  const value = typeof campaign.toObject === 'function' ? campaign.toObject() : campaign;
  return { _id: value._id, status: value.status, revision: value.revision, createdAt: value.createdAt, updatedAt: value.updatedAt,
    approvedAt: value.approvedAt, sender: value.sender,
    items: value.items.map(item => ({ _id: item._id, thread: item.thread, name: item.name, company: item.company, email: item.email,
      emailConfirmed: item.emailConfirmed, emailStatus: item.emailStatus, subject: item.subject, body: item.body, status: item.status,
      scheduledFor: item.scheduledFor, sentAt: item.sentAt, error: item.error })) };
}

export async function listCampaigns(userId) {
  return (await Campaign.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).limit(100).lean()).map(serializeCampaign);
}

export async function getCampaign(userId, id) {
  validId(id);
  const campaign = await Campaign.findOne({ _id: id, user: userId }).select('+connectionVersion');
  if (!campaign) throw new APIError(404, 'Campaign not found.');
  return campaign;
}

export async function createCampaign(userId, threadIds) {
  if (!Array.isArray(threadIds) || !threadIds.length || threadIds.length > 100 || threadIds.some(id => !mongoose.isObjectIdOrHexString(id))
    || new Set(threadIds.map(String)).size !== threadIds.length) throw new APIError(400, 'Select between 1 and 100 distinct outreach drafts.');
  if (!await User.exists({ _id: userId, deactivated: { $ne: true }, outreachDeletingAt: null })) throw new APIError(401, 'Your account is no longer active.');
  const threads = await OutreachThread.find({ _id: { $in: threadIds }, user: userId }).lean();
  if (threads.length !== threadIds.length) throw new APIError(404, 'One or more outreach drafts were not found.');
  const byId = new Map(threads.map(thread => [String(thread._id), thread]));
  const connection = await GmailConnection.findOne({ user: userId, connected: true }).select('email connectionVersion').lean();
  const campaign = await Campaign.create({ user: userId, sender: connection?.email ?? '', connectionVersion: connection?.connectionVersion ?? '', items: threadIds.map(id => {
    const thread = byId.get(String(id));
    return { thread: thread._id, threadRevision: thread.revision ?? 0, threadSnapshotHash: threadSnapshotHash(thread), name: thread.contact?.name ?? '',
      company: thread.jobSnapshot?.company ?? '', email: thread.contact?.email ?? '', emailConfirmed: Boolean(thread.contact?.emailConfirmed),
      emailStatus: thread.contact?.emailStatus ?? 'unavailable', subject: thread.draft?.emailSubject ?? '', body: thread.draft?.emailBody ?? '' };
  }) });
  if (!await User.exists({ _id: userId, deactivated: { $ne: true }, outreachDeletingAt: null })) { await Campaign.deleteOne({ _id: campaign._id }); throw new APIError(401, 'Your account is no longer active.'); }
  return campaign;
}

export async function updateCampaign(userId, id, patch) {
  if (!patch || typeof patch !== 'object' || Object.keys(patch).some(key => !['items', 'revision'].includes(key))
    || !Array.isArray(patch.items) || patch.items.length > 100) throw new APIError(400, 'Provide the messages to edit.');
  if (!Number.isSafeInteger(patch.revision) || patch.revision < 0) throw new APIError(400, 'The reviewed campaign revision is required.');
  const campaign = await getCampaign(userId, id);
  if (campaign.status !== 'draft') throw new APIError(409, 'Approved messages are frozen. Create a new campaign to edit them.');
  if (patch.revision !== campaign.revision) throw new APIError(409, 'This campaign changed. Reload before editing.');
  const seen = new Set();
  for (const changes of patch.items) {
    if (!changes || !mongoose.isObjectIdOrHexString(changes._id) || seen.has(String(changes._id))
      || Object.keys(changes).some(key => !['_id', 'subject', 'body', 'email', 'emailConfirmed', 'removed'].includes(key))) throw new APIError(400, 'Invalid campaign message.');
    seen.add(String(changes._id));
    const item = campaign.items.id(changes._id);
    if (!item) throw new APIError(400, 'Message does not belong to this campaign.');
    if (changes.subject !== undefined) {
      if (typeof changes.subject !== 'string' || changes.subject.length > 500 || /[\r\n\x00-\x1f\x7f]/.test(changes.subject)) throw new APIError(400, 'Subjects must be a single line of at most 500 characters.');
      item.subject = changes.subject;
    }
    if (changes.body !== undefined) { if (typeof changes.body !== 'string' || changes.body.length > 20000) throw new APIError(400, 'Message body is too long.'); item.body = changes.body; }
    if (changes.email !== undefined) {
      if (changes.email !== '' && !validEmail(changes.email)) throw new APIError(400, 'Invalid recipient address.');
      if (changes.email !== item.email) { item.email = changes.email; item.emailStatus = 'unverified'; item.emailConfirmed = false; }
    }
    if (changes.emailConfirmed !== undefined) { if (typeof changes.emailConfirmed !== 'boolean') throw new APIError(400, 'Confirm the recipient address explicitly.'); item.emailConfirmed = changes.emailConfirmed; }
    if (changes.removed !== undefined) { if (typeof changes.removed !== 'boolean') throw new APIError(400, 'Invalid removed flag.'); item.status = changes.removed ? 'removed' : 'draft'; }
  }
  const updated = await Campaign.findOneAndUpdate({ _id: id, user: userId, status: 'draft', revision: campaign.revision },
    { $set: { items: campaign.items.toObject() }, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!updated) throw new APIError(409, 'This campaign changed. Reload before editing.');
  return updated;
}

export async function approveCampaign(userId, id, { revision, now = new Date() } = {}) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new APIError(400, 'The reviewed campaign revision is required.');
  if (!await User.exists({ _id: userId, deactivated: { $ne: true }, outreachDeletingAt: null })) throw new APIError(401, 'Your account is no longer active.');
  const campaign = await getCampaign(userId, id);
  if (['approved', 'completed'].includes(campaign.status) && campaign.approvedRevision === revision) return campaign;
  if (campaign.status !== 'draft' || campaign.revision !== revision) throw new APIError(409, 'This campaign changed or was already approved. Reload and review its current revision.');
  const connection = await GmailConnection.findOne({ user: userId, connected: true });
  if (!connection) throw new APIError(409, 'Connect Gmail before approving messages.');
  if (campaign.sender !== connection.email || campaign.connectionVersion !== connection.connectionVersion) throw new APIError(409, 'The sending account changed. Create a new campaign and review its sender before approving.');
  const items = campaign.items.filter(item => item.status !== 'removed');
  if (!items.length) throw new APIError(400, 'Select at least one message to send.');
  const threads = await OutreachThread.find({ user: userId, _id: { $in: items.map(item => item.thread) } }).lean();
  const byId = new Map(threads.map(thread => [String(thread._id), thread]));
  const recipients = new Set();
  for (const item of items) {
    const thread = byId.get(String(item.thread));
    if (!thread || thread.revision !== item.threadRevision || threadSnapshotHash(thread) !== item.threadSnapshotHash) throw new APIError(409, 'An outreach draft changed or was removed. Create a new campaign from the current drafts.');
    if (!item.emailConfirmed && item.emailStatus !== 'verified') throw new APIError(400, 'Every recipient address must be verified or explicitly confirmed.');
    buildRawMessage({ from: connection.email, to: item.email, subject: item.subject, body: item.body });
    const recipient = item.email.toLowerCase();
    if (recipients.has(recipient)) throw new APIError(400, 'A campaign cannot send multiple messages to the same address.');
    recipients.add(recipient);
    item.status = 'queued'; item.scheduledFor = now;
  }
  const approved = await Campaign.findOneAndUpdate({ _id: id, user: userId, status: 'draft', revision: campaign.revision },
    { $set: { status: 'approved', approvedAt: now, approvedRevision: revision, items: campaign.items.toObject() }, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!approved) {
    const concurrent = await Campaign.findOne({ _id: id, user: userId, status: { $in: ['approved', 'completed'] }, approvedRevision: revision });
    if (concurrent) return concurrent;
    throw new APIError(409, 'This campaign changed. Reload before approving.');
  }
  return approved;
}

export async function cancelCampaign(userId, id) {
  validId(id);
  const campaign = await Campaign.findOneAndUpdate({ _id: id, user: userId, status: { $in: ['draft', 'approved'] } },
    { $set: { status: 'cancelled', 'items.$[pending].status': 'cancelled', 'items.$[pending].error': 'Cancelled before sending.' }, $inc: { revision: 1 } },
    { new: true, arrayFilters: [{ 'pending.status': { $in: ['draft', 'queued'] } }] });
  return campaign ?? getCampaign(userId, id);
}

async function finishCampaign(id) {
  await Campaign.updateOne({ _id: id, status: 'approved', items: { $not: { $elemMatch: { status: { $in: ['queued', 'sending'] } } } } }, { $set: { status: 'completed' } });
}

async function updateClaim(campaignId, itemId, claimToken, changes) {
  return Campaign.updateOne({ _id: campaignId, items: { $elemMatch: { _id: itemId, status: 'sending', claimToken } } },
    { $set: Object.fromEntries(Object.entries(changes).map(([key, value]) => [`items.$.${key}`, value])) });
}

async function recoverUncertainClaims(now) {
  const campaigns = await Campaign.find({ items: { $elemMatch: { status: 'sending', claimedAt: { $lt: new Date(now.getTime() - CLAIM_TIMEOUT_MS) } } } }).select('_id').limit(100).lean();
  for (const campaign of campaigns) {
    await Campaign.updateOne({ _id: campaign._id }, { $set: { 'items.$[stale].status': 'review_required',
      'items.$[stale].error': 'Sending was interrupted. Check your Gmail Sent folder before creating another message.' } },
    { arrayFilters: [{ 'stale.status': 'sending', 'stale.claimedAt': { $lt: new Date(now.getTime() - CLAIM_TIMEOUT_MS) } }] });
    await finishCampaign(campaign._id);
  }
  await GmailConnection.updateMany({ sendClaimedAt: { $lt: new Date(now.getTime() - CLAIM_TIMEOUT_MS) }, sendClaimToken: { $ne: '' } },
    { $set: { sendClaimToken: '', sendClaimedAt: null } });
}

async function processItem(campaign, item, clock, send) {
  const now = clock();
  const claimToken = randomUUID();
  const claimed = await Campaign.updateOne({ _id: campaign._id, status: 'approved', items: { $elemMatch: { _id: item._id, status: 'queued', scheduledFor: { $lte: now } } } },
    { $set: { 'items.$.status': 'sending', 'items.$.claimToken': claimToken, 'items.$.claimedAt': now } });
  if (!claimed.modifiedCount) return;
  if (!await User.exists({ _id: campaign.user, deactivated: { $ne: true }, outreachDeletingAt: null })) { await updateClaim(campaign._id, item._id, claimToken, { status: 'cancelled', error: 'Account is unavailable.' }); return; }
  const baseFilter = { user: campaign.user, connected: true, connectionVersion: campaign.connectionVersion };
  const reservationTime = clock();
  const connection = await GmailConnection.findOneAndUpdate({ ...baseFilter, nextSendAt: { $lte: reservationTime },
    $or: [{ sendClaimToken: '' }, { sendClaimToken: { $exists: false } }],
    $expr: { $lt: [{ $size: { $filter: { input: { $ifNull: ['$sendReservations', []] }, as: 'attempt', cond: { $gt: ['$$attempt', new Date(reservationTime.getTime() - DAY_MS)] } } } }, 25] },
  }, { $set: { sendClaimToken: claimToken, sendClaimedAt: reservationTime } }, { new: true }).select('+encryptedRefreshToken');
  if (!connection) {
    const waiting = await GmailConnection.findOne(baseFilter).lean();
    if (!waiting) { await updateClaim(campaign._id, item._id, claimToken, { status: 'failed', error: 'Gmail changed or was disconnected. Review and approve a new campaign.' }); return; }
    const waitingTime = clock();
    const recent = waiting.sendReservations.filter(attempt => new Date(attempt).getTime() > waitingTime.getTime() - DAY_MS);
    const nextTime = Math.max(waitingTime.getTime() + 1000, new Date(waiting.nextSendAt).getTime(), recent.length >= 25 ? new Date(recent[0]).getTime() + DAY_MS : 0);
    await updateClaim(campaign._id, item._id, claimToken, { status: 'queued', scheduledFor: new Date(nextTime), claimToken: '', claimedAt: null });
    return;
  }
  try {
    // A durable per-user lock spans the provider call. Timestamp each handoff
    // with a fresh clock rather than the scheduler tick's starting time.
    const [approved, active, contactExists] = await Promise.all([
      Campaign.exists({ _id: campaign._id, user: campaign.user, status: 'approved' }),
      User.exists({ _id: campaign.user, deactivated: { $ne: true }, outreachDeletingAt: null }),
      OutreachThread.exists({ _id: item.thread, user: campaign.user }),
    ]);
    if (!approved || !active || !contactExists) { await updateClaim(campaign._id, item._id, claimToken, { status: 'cancelled', error: 'The campaign, account, or recipient was removed before sending.' }); return; }
    const handoffTime = clock();
    const authorized = await GmailConnection.updateOne({ _id: connection._id, connected: true, connectionVersion: campaign.connectionVersion, sendClaimToken: claimToken },
      { $set: { nextSendAt: new Date(handoffTime.getTime() + SPACING_MS) }, $push: { sendReservations: { $each: [handoffTime], $slice: -25 } } });
    if (!authorized.modifiedCount) { await updateClaim(campaign._id, item._id, claimToken, { status: 'cancelled', error: 'Gmail was disconnected before sending.' }); return; }
    const delivered = await send(connection, { to: item.email, subject: item.subject, body: item.body }, { beforeSend: async () => {
      // Refreshing Google's access token may take time. Recheck after that
      // preparation, immediately before the actual Gmail HTTP send request.
      const [stillApproved, stillActive, stillOwned] = await Promise.all([
        Campaign.exists({ _id: campaign._id, user: campaign.user, status: 'approved' }),
        User.exists({ _id: campaign.user, deactivated: { $ne: true }, outreachDeletingAt: null }),
        OutreachThread.exists({ _id: item.thread, user: campaign.user }),
      ]);
      if (!stillApproved || !stillActive || !stillOwned) throw Object.assign(new Error('Sending was cancelled.'), { ambiguous: false });
      const actualHandoff = clock();
      const refreshed = await GmailConnection.updateOne({ _id: connection._id, connected: true, connectionVersion: campaign.connectionVersion, sendClaimToken: claimToken },
        { $set: { nextSendAt: new Date(actualHandoff.getTime() + SPACING_MS), 'sendReservations.$[reserved]': actualHandoff } },
        { arrayFilters: [{ reserved: handoffTime }] });
      // A no-op is valid when the clock has not advanced, so check matching.
      if (!refreshed.matchedCount) throw Object.assign(new Error('Gmail authorization changed before sending.'), { ambiguous: false });
    } });
    const sentAt = clock();
    await updateClaim(campaign._id, item._id, claimToken, { status: 'sent', sentAt, providerMessageId: String(delivered.id), error: '' });
    // Manual reply/interview/closed states take precedence over send results.
    await OutreachThread.updateOne({ _id: item.thread, user: campaign.user, status: { $in: ['saved', 'drafted', 'sent', 'followed_up'] } },
      { $set: { status: 'sent', lastSentAt: sentAt, followUpAt: addWeekdays(sentAt) }, $inc: { revision: 1 } });
  } catch (error) {
    const { ambiguous } = classifyGmailFailure(error);
    await updateClaim(campaign._id, item._id, claimToken, { status: ambiguous ? 'review_required' : 'failed',
      error: ambiguous ? 'Delivery is uncertain. Check your Gmail Sent folder before creating another message.' : 'Gmail rejected this message or authorization expired. Review it before creating a new campaign.' });
  } finally {
    await GmailConnection.updateOne({ _id: connection._id, sendClaimToken: claimToken }, { $set: { sendClaimToken: '', sendClaimedAt: null } });
  }
}

let ticking = false;
export async function processCampaignQueue({ now, clock = now ? () => new Date(now) : () => new Date(), send = sendGmailMessage } = {}) {
  if (ticking) return;
  ticking = true;
  try {
    await recoverUncertainClaims(clock());
    const campaigns = await Campaign.find({ status: 'approved', items: { $elemMatch: { status: 'queued', scheduledFor: { $lte: clock() } } } }).select('+connectionVersion').sort({ createdAt: 1 }).limit(25).lean();
    for (const campaign of campaigns) {
      for (const item of campaign.items.filter(value => value.status === 'queued' && new Date(value.scheduledFor) <= clock())) await processItem(campaign, item, clock, send);
      await finishCampaign(campaign._id);
    }
  } finally { ticking = false; }
}

export async function cleanupUserCampaignData(userId, { revoke = true } = {}) {
  if (revoke) await disconnectGmail(userId);
  else await GmailConnection.updateOne({ user: userId }, { $set: { connected: false } });
  await Promise.all([Campaign.deleteMany({ user: userId }), GmailOAuthState.deleteMany({ user: userId }), GmailConnection.deleteMany({ user: userId })]);
}
