import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import GmailConnection from '../models/GmailConnection.js';
import GmailOAuthState from '../models/GmailOAuthState.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import { APIError } from '../middleware/errorHandler.js';

const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const hash = value => createHash('sha256').update(String(value)).digest('hex');

function encryptionKey(raw = process.env.GMAIL_TOKEN_ENCRYPTION_KEY) {
  const key = Buffer.from(String(raw ?? ''), 'base64');
  if (key.length !== 32 || key.toString('base64') !== String(raw)) throw new APIError(503, 'Gmail token encryption configuration is missing or invalid.');
  return key;
}

export function encryptRefreshToken(token, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), nonce);
  const ciphertext = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptRefreshToken(value, key) {
  const [version, nonce, tag, ciphertext, extra] = String(value).split('.');
  if (version !== 'v1' || !nonce || !tag || !ciphertext || extra) throw new Error('Invalid Gmail token envelope.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), Buffer.from(nonce, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

export function createGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REDIRECT_URI) throw new APIError(503, 'Gmail OAuth configuration is not available.');
  const redirect = new URL(GMAIL_REDIRECT_URI);
  if (redirect.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(redirect.hostname))) throw new APIError(503, 'Gmail OAuth redirect configuration is invalid.');
  encryptionKey();
  return new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI);
}

export function validEmail(value) {
  return typeof value === 'string' && value.length <= 320 && /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,63}$/i.test(value) && !/[\r\n\x00-\x20\x7f]/.test(value);
}

export function buildRawMessage({ from, to, subject, body }) {
  if (!validEmail(from) || !validEmail(to)) throw new APIError(400, 'A valid sender and recipient address are required.');
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 500 || /[\r\n\x00-\x1f\x7f]/.test(subject)) throw new APIError(400, 'A valid single-line subject is required.');
  if (typeof body !== 'string' || !body.trim() || body.length > 20000) throw new APIError(400, 'A message body of at most 20000 characters is required.');
  const encodedBody = Buffer.from(body, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
  // Encoded words are limited to 75 bytes by RFC 2047; preserve complete UTF-8
  // characters while folding long subjects into valid continuation lines.
  const words = []; let word = '';
  for (const character of subject) {
    if (Buffer.byteLength(word + character) > 42) { words.push(word); word = ''; }
    word += character;
  }
  if (word) words.push(word);
  const encodedSubject = words.map(part => `=?UTF-8?B?${Buffer.from(part, 'utf8').toString('base64')}?=`).join('\r\n ');
  const mime = [
    `From: ${from}`, `To: ${to}`, `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encodedBody,
  ].join('\r\n');
  return Buffer.from(mime, 'utf8').toString('base64url');
}

export function classifyGmailFailure(error) {
  if (typeof error?.ambiguous === 'boolean') return { ambiguous: error.ambiguous };
  if (error instanceof APIError) return { ambiguous: false };
  const status = Number(error?.status ?? error?.response?.status);
  return { ambiguous: ![400, 401, 403, 404, 413, 429].includes(status) };
}

export async function createGmailAuthorization(user, sessionToken, { client = createGmailClient(), now = new Date() } = {}) {
  if (!sessionToken) throw new APIError(401, 'Please sign in before connecting Gmail.');
  if (!await User.exists({ _id: user._id, sessionVersion: user.sessionVersion ?? 0, deactivated: { $ne: true }, outreachDeletingAt: null })) throw new APIError(401, 'Your account is no longer active.');
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  // A disconnected tombstone makes a disconnect durable even before the first
  // grant completes. Starting a newer grant invalidates previous pending grants.
  const connection = await GmailConnection.findOneAndUpdate({ user: user._id }, {
    $inc: { oauthEpoch: 1 }, $setOnInsert: { email: '', connected: false, connectionVersion: randomUUID(), nextSendAt: new Date(0), sendReservations: [] },
  }, { upsert: true, new: true, setDefaultsOnInsert: false });
  const nonce = await GmailOAuthState.create({ user: user._id, stateHash: hash(state), sessionHash: hash(sessionToken), sessionVersion: user.sessionVersion ?? 0,
    connection: connection._id, oauthEpoch: connection.oauthEpoch,
    encryptedVerifier: encryptRefreshToken(verifier), expiresAt: new Date(now.getTime() + 10 * 60 * 1000) });
  if (!await User.exists({ _id: user._id, sessionVersion: user.sessionVersion ?? 0, deactivated: { $ne: true }, outreachDeletingAt: null })) {
    await GmailOAuthState.deleteOne({ _id: nonce._id });
    await GmailConnection.deleteOne({ _id: connection._id, oauthEpoch: connection.oauthEpoch, connected: false });
    throw new APIError(401, 'Your account is no longer active.');
  }
  return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', include_granted_scopes: false,
    scope: ['openid', 'email', SEND_SCOPE], state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
}

export async function completeGmailAuthorization(user, sessionToken, { state, code, error }, { client = createGmailClient(), now = new Date() } = {}) {
  if (typeof state !== 'string' || state.length > 200 || !sessionToken) throw new APIError(400, 'Invalid Gmail authorization state.');
  // The nonce is consumed before code exchange and cannot be replayed, even if
  // Google rejects the code or the user declines the requested scope.
  const nonce = await GmailOAuthState.findOneAndDelete({ user: user._id, stateHash: hash(state), sessionHash: hash(sessionToken),
    sessionVersion: user.sessionVersion ?? 0, expiresAt: { $gt: now } }).select('+encryptedVerifier');
  if (!nonce || error || typeof code !== 'string' || code.length > 4096) throw new APIError(400, 'Gmail authorization expired or was declined.');
  const { tokens } = await client.getToken({ code, codeVerifier: decryptRefreshToken(nonce.encryptedVerifier), redirect_uri: process.env.GMAIL_REDIRECT_URI });
  if (!String(tokens.scope ?? '').split(' ').includes(SEND_SCOPE) || !tokens.id_token || !tokens.refresh_token) throw new APIError(400, 'Gmail send permission and offline access are required.');
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GMAIL_CLIENT_ID });
  const identity = ticket.getPayload();
  if (!identity?.email_verified || !validEmail(identity.email)) throw new APIError(400, 'Google did not provide a verified sender email.');
  // Account deletion and session revocation must not create a new connection.
  if (!await User.exists({ _id: user._id, sessionVersion: user.sessionVersion ?? 0, deactivated: { $ne: true }, outreachDeletingAt: null })) throw new APIError(401, 'Your session is no longer active.');
  const version = randomUUID();
  let prior;
  try {
    prior = await GmailConnection.findOneAndUpdate({ _id: nonce.connection, user: user._id, oauthEpoch: nonce.oauthEpoch }, {
      $set: { email: identity.email.toLowerCase(), encryptedRefreshToken: encryptRefreshToken(tokens.refresh_token), connected: true, connectionVersion: version },
      $inc: { oauthEpoch: 1 },
    }, { new: false, runValidators: true });
  } catch (error) {
    if (error.code === 11000) throw new APIError(409, 'This Gmail address is already connected to another Jobverify account. Disconnect it there first.');
    throw error;
  }
  if (!prior) throw new APIError(409, 'Gmail was disconnected or its authorization changed. Start connecting again.');
  // Drafts contain a reviewed sender too. Invalidate both old drafts and
  // approved work, including drafts created before the first Gmail connection.
  // Exclude drafts created for this or a newer successful connection.
  await Campaign.updateMany({ user: user._id, $or: [
    { status: 'approved', connectionVersion: prior.connectionVersion },
    { status: 'draft', connectionVersion: { $in: [prior.connectionVersion, '', null] } },
  ] }, {
    $set: { status: 'cancelled', 'items.$[pending].status': 'cancelled', 'items.$[pending].error': 'The sending account changed. Create and review a new campaign.' },
    $inc: { revision: 1 },
  }, { arrayFilters: [{ 'pending.status': { $in: ['draft', 'queued'] } }] });
  if (!await User.exists({ _id: user._id, sessionVersion: user.sessionVersion ?? 0, deactivated: { $ne: true }, outreachDeletingAt: null })) {
    await GmailConnection.updateOne({ _id: nonce.connection, connectionVersion: version }, { $set: { connected: false }, $unset: { encryptedRefreshToken: 1 }, $inc: { oauthEpoch: 1 } });
    throw new APIError(401, 'Your account is no longer active.');
  }
  return { connected: true, email: identity.email.toLowerCase() };
}

export async function getGmailStatus(userId) {
  const connection = await GmailConnection.findOne({ user: userId, connected: true }).select('email').lean();
  return { connected: Boolean(connection), email: connection?.email ?? '' };
}

export async function cancelQueuedCampaigns(userId, reason = 'Campaign cancelled.') {
  await Campaign.updateMany({ user: userId, status: { $in: ['draft', 'approved'] } }, {
    $set: { status: 'cancelled', 'items.$[pending].status': 'cancelled', 'items.$[pending].error': reason },
  }, { arrayFilters: [{ 'pending.status': { $in: ['draft', 'queued'] } }] });
}

export async function disconnectGmail(userId, { clientFactory = createGmailClient } = {}) {
  const connection = await GmailConnection.findOneAndUpdate({ user: userId }, {
    $set: { connected: false }, $inc: { oauthEpoch: 1 },
    $setOnInsert: { email: '', connectionVersion: randomUUID(), nextSendAt: new Date(0), sendReservations: [] },
  }, { upsert: true, new: true, setDefaultsOnInsert: false }).select('+encryptedRefreshToken');
  await cancelQueuedCampaigns(userId, 'Gmail was disconnected.');
  await GmailOAuthState.deleteMany({ user: userId });
  if (connection?.encryptedRefreshToken) {
    try { await clientFactory().revokeToken(decryptRefreshToken(connection.encryptedRefreshToken)); } catch { /* Local disconnect remains effective when Google is unavailable. */ }
    await GmailConnection.updateOne({ _id: connection._id, connected: false, oauthEpoch: connection.oauthEpoch }, { $unset: { encryptedRefreshToken: 1 } });
  }
}

export async function sendGmailMessage(connection, message, { client = createGmailClient(), request = fetch, beforeSend } = {}) {
  let token;
  try { client.setCredentials({ refresh_token: decryptRefreshToken(connection.encryptedRefreshToken) }); token = (await client.getAccessToken()).token; }
  catch { throw Object.assign(new Error('Gmail authorization is unavailable. Reconnect Gmail.'), { ambiguous: false }); }
  if (!token) throw Object.assign(new Error('Gmail authorization is unavailable. Reconnect Gmail.'), { ambiguous: false });
  const raw = buildRawMessage({ from: connection.email, ...message });
  if (beforeSend) await beforeSend();
  // No automatic retry: a timeout may mean Google accepted the email already.
  const response = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Object.assign(new Error('Gmail could not confirm this message.'), { status: response.status });
  const result = await response.json();
  if (!result.id) throw Object.assign(new Error('Gmail returned an incomplete delivery response.'), { ambiguous: true });
  return { id: String(result.id) };
}
