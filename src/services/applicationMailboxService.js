import { createHash, randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import ApplicationMailbox from '../models/ApplicationMailbox.js';
import ApplicationMailboxAuth from '../models/ApplicationMailboxAuth.js';
import ApplicationMail from '../models/ApplicationMail.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { APIError } from '../middleware/errorHandler.js';
import { createGmailClient, encryptRefreshToken, decryptRefreshToken, validEmail } from './gmailService.js';
import { currentMessageText, matchAcknowledgement } from './applicationMailMatching.js';
import { recordApplicationEvidence } from './applicationService.js';

const READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const ownerFilter = user => ({ _id: user, deactivated: { $ne: true }, outreachDeletingAt: null });
const liveFilter = connection => ({ _id: connection._id, user: connection.user, connected: true, connectionVersion: connection.connectionVersion });

async function requireOwner(user, sessionVersion) {
  if (!await User.exists({ ...ownerFilter(user), ...(sessionVersion === undefined ? {} : { sessionVersion }) })) throw new APIError(401, 'Your account is no longer active.');
}

async function requireConnection(connection) {
  await requireOwner(connection.user);
  if (!await ApplicationMailbox.exists(liveFilter(connection))) throw new APIError(409, 'Mailbox connection changed. Reconnect to continue.');
}

export async function createMailboxAuthorization(user, sessionToken, { client = createGmailClient(), now = new Date() } = {}) {
  if (!sessionToken) throw new APIError(401, 'Sign in before connecting your application mailbox.');
  await requireOwner(user._id, user.sessionVersion ?? 0);
  const state = `mailbox.${randomBytes(32).toString('base64url')}`;
  const verifier = randomBytes(48).toString('base64url');
  const connection = await ApplicationMailbox.findOneAndUpdate({ user: user._id }, {
    $inc: { oauthEpoch: 1 }, $setOnInsert: { connected: false, connectionVersion: randomUUID() },
  }, { upsert: true, new: true });
  await ApplicationMailboxAuth.create({ user: user._id, stateHash: hash(state), sessionHash: hash(sessionToken), sessionVersion: user.sessionVersion ?? 0,
    oauthEpoch: connection.oauthEpoch, encryptedVerifier: encryptRefreshToken(verifier), expiresAt: new Date(now.getTime() + 600000) });
  try { await requireOwner(user._id, user.sessionVersion ?? 0); }
  catch (error) {
    if (!await User.exists({ _id: user._id, outreachDeletingAt: null })) {
      await Promise.all([ApplicationMailboxAuth.deleteMany({ user: user._id }), ApplicationMailbox.deleteMany({ user: user._id })]);
    }
    throw error;
  }
  return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', include_granted_scopes: false, scope: ['openid', 'email', READ_SCOPE], state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
}

export async function completeMailboxAuthorization(user, sessionToken, { state, code, error }, { client = createGmailClient(), now = new Date() } = {}) {
  if (!sessionToken || typeof state !== 'string' || !state.startsWith('mailbox.') || state.length > 200) throw new APIError(400, 'Invalid mailbox authorization.');
  const nonce = await ApplicationMailboxAuth.findOneAndDelete({ user: user._id, stateHash: hash(state), sessionHash: hash(sessionToken), sessionVersion: user.sessionVersion ?? 0, expiresAt: { $gt: now } }).select('+encryptedVerifier');
  if (!nonce || error || typeof code !== 'string' || code.length > 4096) throw new APIError(400, 'Mailbox authorization expired or was declined.');
  const { tokens } = await client.getToken({ code, codeVerifier: decryptRefreshToken(nonce.encryptedVerifier), redirect_uri: process.env.GMAIL_REDIRECT_URI });
  if (!String(tokens.scope || '').split(' ').includes(READ_SCOPE) || !tokens.refresh_token || !tokens.id_token) throw new APIError(400, 'Gmail read permission and offline access are required.');
  const identity = (await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GMAIL_CLIENT_ID })).getPayload();
  if (!identity?.email_verified || !validEmail(identity.email)) throw new APIError(400, 'Google did not return a verified mailbox.');
  await requireOwner(user._id, user.sessionVersion ?? 0);
  const version = randomUUID();
  const row = await ApplicationMailbox.findOneAndUpdate({ user: user._id, oauthEpoch: nonce.oauthEpoch }, { $set: {
    connected: true, email: identity.email.toLowerCase(), encryptedRefreshToken: encryptRefreshToken(tokens.refresh_token), connectionVersion: version,
    lastSyncedAt: null, nextSyncAt: now, scanStartedAt: null, scanAfter: 0, pageToken: '', leaseToken: '', leaseUntil: new Date(0), error: '',
  }, $inc: { oauthEpoch: 1 } }, { new: true });
  if (!row) throw new APIError(409, 'Mailbox authorization changed. Connect again.');
  try { await requireOwner(user._id, user.sessionVersion ?? 0); }
  catch (error) { await ApplicationMailbox.updateOne({ user: user._id, connectionVersion: version }, { $set: { connected: false }, $unset: { encryptedRefreshToken: 1 } }); throw error; }
  return getMailboxStatus(user._id);
}

export async function getMailboxStatus(user) {
  const row = await ApplicationMailbox.findOne({ user }).select('connected email lastSyncedAt error leaseUntil').lean();
  return { connected: Boolean(row?.connected), email: row?.email || '', lastSyncedAt: row?.lastSyncedAt || null,
    syncing: Boolean(row?.connected && row.leaseUntil > new Date()), error: row?.error || '' };
}

export async function disconnectApplicationMailbox(user) {
  // This consent is independent of outreach. Do not revoke Google's entire
  // client grant here, which can also revoke the user's send authorization.
  await ApplicationMailbox.updateOne({ user }, { $set: { connected: false, connectionVersion: randomUUID(), leaseToken: '', leaseUntil: new Date(0), pageToken: '', error: '' },
    $unset: { encryptedRefreshToken: 1 }, $inc: { oauthEpoch: 1 } });
  await ApplicationMailboxAuth.deleteMany({ user });
}

export function parseApplicationMessage(raw) {
  const headers = raw.payload?.headers || [];
  const header = name => String(headers.find(item => String(item.name).toLowerCase() === name)?.value || '');
  const plain = []; const html = []; let parts = 0;
  function visit(part, depth = 0) {
    if (!part || depth > 8 || ++parts > 50 || part.filename) return;
    const data = typeof part.body?.data === 'string' ? Buffer.from(part.body.data.slice(0, 140000), 'base64url').toString('utf8').slice(0, 100000) : '';
    if (part.mimeType === 'text/plain') plain.push(data);
    if (part.mimeType === 'text/html') html.push(data);
    for (const child of (part.parts || []).slice(0, 50)) visit(child, depth + 1);
  }
  visit(raw.payload);
  const markup = html.join('\n').replace(/<(?:script|style|blockquote)\b[^>]*>[\s\S]*?<\/(?:script|style|blockquote)>/gi, '');
  const text = currentMessageText(plain.length ? plain.join('\n') : markup.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'"));
  const links = [...text.matchAll(/https:\/\/[^\s<>"']+/g), ...markup.matchAll(/href=["'](https:\/\/[^"']+)["']/gi)]
    .map(match => (match[1] || match[0]).replace(/&amp;/g, '&')).slice(0, 100);
  return { subject: header('subject').slice(0, 500), sender: header('from').slice(0, 500), text, links, receivedAt: new Date(Number(raw.internalDate)) };
}

export async function ingestApplicationMessage(connection, raw) {
  await requireConnection(connection);
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 200 || raw.labelIds?.some(label => ['SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label))) return null;
  const message = parseApplicationMessage(raw);
  if (!Number.isFinite(message.receivedAt.getTime()) || message.receivedAt > new Date(Date.now() + 300000)
    || message.sender.toLowerCase().includes(connection.email.toLowerCase())) return null;
  const applications = await Application.find({ user: connection.user, firstOpenedAt: { $lte: new Date(message.receivedAt.getTime() + 86400000) } }).select('jobSnapshot firstOpenedAt').lean();
  const match = matchAcknowledgement(message, applications);
  if (!match.acknowledgement) return null;
  const filter = { user: connection.user, mailboxEmail: connection.email, messageId: raw.id };
  let row;
  try { row = await ApplicationMail.findOneAndUpdate(filter, { $setOnInsert: { ...filter, connectionVersion: connection.connectionVersion,
    threadId: String(raw.threadId || '').slice(0, 200), subject: message.subject, sender: message.sender, excerpt: message.text.slice(0, 500), receivedAt: message.receivedAt,
    status: 'pending', application: match.applicationId, candidates: match.candidates, matchReason: match.reason,
  } }, { upsert: true, new: true, runValidators: true }); }
  catch (error) { if (error.code !== 11000) throw error; row = await ApplicationMail.findOne(filter); }
  try { await requireConnection(connection); }
  catch (error) {
    if (!await User.exists({ _id: connection.user, outreachDeletingAt: null })) await ApplicationMail.deleteMany({ user: connection.user });
    throw error;
  }
  if (row.status === 'pending' && row.application) await linkMessage(row, row.application, connection);
  return row;
}

async function linkMessage(row, applicationId, connection) {
  await requireConnection(connection);
  if (!await Application.exists({ _id: applicationId, user: row.user })) throw new APIError(404, 'Application not found.');
  const bound = await ApplicationMail.findOneAndUpdate({ _id: row._id, user: row.user, status: 'pending',
    $or: [{ application: null }, { application: applicationId }],
  }, { $set: { application: applicationId } }, { new: true });
  if (!bound) throw new APIError(409, 'This acknowledgement has already been handled.');
  const application = await recordApplicationEvidence(row.user, applicationId, { key: `gmail:${row._id}`, source: 'email', observedAt: row.receivedAt,
    summary: row.subject || row.excerpt, reference: String(row._id) });
  if (!application) throw new APIError(404, 'Application not found.');
  await ApplicationMail.updateOne({ _id: row._id, user: row.user, status: 'pending' }, { $set: { status: 'linked', application: applicationId } });
  return application;
}

export async function resolveApplicationMail(user, id, { applicationId, dismiss = false } = {}) {
  if (!mongoose.isObjectIdOrHexString(id) || (!dismiss && !mongoose.isObjectIdOrHexString(applicationId))) throw new APIError(400, 'Select an application or dismiss this email.');
  const row = await ApplicationMail.findOne({ _id: id, user, status: 'pending' });
  if (!row) throw new APIError(404, 'Pending acknowledgement not found.');
  if (dismiss) {
    const result = await ApplicationMail.updateOne({ _id: id, user, status: 'pending', application: null }, { $set: { status: 'dismissed' } });
    if (!result.matchedCount) throw new APIError(409, 'This acknowledgement is already being linked.');
    return { dismissed: true };
  }
  const connection = await ApplicationMailbox.findOne({ user, connected: true, email: row.mailboxEmail }).lean();
  if (!connection) throw new APIError(409, 'Reconnect this mailbox before linking its acknowledgement.');
  return linkMessage(row, applicationId, connection);
}

export async function listApplicationMail(user) {
  return ApplicationMail.find({ user, status: 'pending' }).sort({ receivedAt: -1, _id: -1 }).limit(50)
    .populate({ path: 'candidates', match: { user }, select: 'jobSnapshot' })
    .select('subject sender excerpt receivedAt candidates mailboxEmail').lean();
}

export async function listApplicationMailChoices(user, query = '') {
  if (typeof query !== 'string' || query.length > 100) throw new APIError(400, 'Search with at most 100 characters.');
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return Application.find({ user, ...(query ? { $or: [{ 'jobSnapshot.title': pattern }, { 'jobSnapshot.company': pattern }] } : {}) })
    .sort({ firstOpenedAt: -1 }).limit(50).select('jobSnapshot').lean();
}

export async function requestMailboxSync(user) {
  const row = await ApplicationMailbox.findOneAndUpdate({ user, connected: true }, { $set: { nextSyncAt: new Date(0) } });
  if (!row) throw new APIError(409, 'Connect your application mailbox first.');
  return { queued: true };
}

export async function processApplicationMailboxQueue({ clientFactory = createGmailClient, request = fetch, now = new Date() } = {}) {
  const leaseToken = randomUUID();
  const connection = await ApplicationMailbox.findOneAndUpdate({ connected: true, nextSyncAt: { $lte: now }, leaseUntil: { $lte: now } }, {
    $set: { leaseToken, leaseUntil: new Date(now.getTime() + 10 * 60000) },
  }, { new: true, sort: { nextSyncAt: 1 } }).select('+encryptedRefreshToken +leaseToken +pageToken').lean();
  if (!connection) return { processed: 0 };
  const lease = { ...liveFilter(connection), leaseToken };
  try {
    await requireConnection(connection);
    const client = clientFactory();
    client.setCredentials({ refresh_token: decryptRefreshToken(connection.encryptedRefreshToken) });
    const token = (await client.getAccessToken()).token;
    if (!token) throw new Error('Mailbox authorization unavailable.');
    const scanStartedAt = connection.scanStartedAt || now;
    const scanAfter = connection.scanAfter || Math.floor((connection.lastSyncedAt ? new Date(connection.lastSyncedAt).getTime() - 2 * 86400000 : now.getTime() - 90 * 86400000) / 1000);
    await ApplicationMailbox.updateOne(lease, { $set: { scanStartedAt, scanAfter } });
    async function get(path, params = {}) {
      await requireConnection(connection);
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`);
      for (const [key, value] of Object.entries(params)) if (value !== '') url.searchParams.set(key, value);
      const response = await request(url.href, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Object.assign(new Error('Mailbox sync failed.'), { status: response.status });
      return response.json();
    }
    const list = await get('messages', { maxResults: '20', pageToken: connection.pageToken || '',
      q: `after:${scanAfter} -in:sent -in:drafts -in:spam -in:trash {"thank you for applying" "thanks for applying" "thank you for your application" "received your application" "application received" "application submitted" "application has been received" "application has been submitted"}` });
    for (const item of (list.messages || []).slice(0, 20)) {
      if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(item.id)) continue;
      const raw = await get(`messages/${encodeURIComponent(item.id)}`, { format: 'full' });
      await ingestApplicationMessage(connection, raw);
    }
    const more = typeof list.nextPageToken === 'string' && list.nextPageToken.length < 4096 ? list.nextPageToken : '';
    await ApplicationMailbox.updateOne(lease, { $set: { pageToken: more, error: '', leaseToken: '', leaseUntil: new Date(0),
      nextSyncAt: new Date(now.getTime() + (more ? 1000 : 5 * 60000)),
      ...(more ? {} : { lastSyncedAt: scanStartedAt, scanStartedAt: null, scanAfter: 0 }),
    } });
    return { processed: (list.messages || []).length, hasMore: Boolean(more) };
  } catch (error) {
    await ApplicationMailbox.updateOne(lease, { $set: { leaseToken: '', leaseUntil: new Date(0), nextSyncAt: new Date(now.getTime() + 5 * 60000),
      error: [401, 403].includes(error.status) ? 'Gmail read access is unavailable. Reconnect your mailbox.' : 'Could not sync application acknowledgements. We will retry.',
      ...(error.status === 400 ? { pageToken: '' } : {}),
    } });
    return { processed: 0, failed: true };
  }
}
