import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { currentMessageText, isAcknowledgement } from './applicationMailMatching.js';

export const MAX_APPLICATION_RAW_BYTES = 512 * 1024;
const MAX_HEADER_BYTES = 32768;
const CRITICAL = ['from', 'to', 'subject', 'date', 'message-id', 'mime-version', 'content-type', 'content-transfer-encoding', 'content-disposition'];
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const failure = code => Object.assign(new Error('Mailbox authentication unavailable.'), { code });
const digest = value => createHash('sha256').update(value).digest('hex');

// Server provisioning only. No rules are inferred from mail, a company slug, or
// a shared ATS signing domain. Missing/invalid configuration means review.
export function applicationMailTrustRules() {
  try {
    const value = process.env.APPLICATION_MAIL_TRUST_RULES || '[]';
    if (value.length > 32768) return [];
    const rules = JSON.parse(value);
    return Array.isArray(rules) && rules.length <= 100 ? rules : [];
  } catch { return []; }
}

function splitEntity(bytes) {
  const boundary = bytes.indexOf('\r\n\r\n');
  if (boundary < 0 || boundary > MAX_HEADER_BYTES) throw failure('invalid_headers');
  const source = bytes.subarray(0, boundary).toString('latin1');
  if (/[^\x09\x20-\x7e\r\n]/.test(source) || /(^|[^\r])\n|\r(?!\n)/.test(source)) throw failure('invalid_headers');
  const fields = source.replace(/\r\n[\t ]+/g, ' ').split('\r\n');
  if (fields.length > 100 || fields.some(line => line.length > 8192)) throw failure('header_limit');
  const headers = new Map();
  for (const field of fields) {
    const match = /^([a-zA-Z0-9-]+):[\t ]*(.*)$/.exec(field);
    if (!match) throw failure('invalid_headers');
    const name = match[1].toLowerCase();
    headers.set(name, [...(headers.get(name) || []), match[2].trim()]);
  }
  return { headers, body: bytes.subarray(boundary + 4) };
}

function decodeTransfer(bytes, encoding = '7bit') {
  const source = bytes.toString('latin1');
  if (encoding === 'base64') {
    const value = source.replace(/[\r\n\t ]/g, '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw failure('invalid_encoding');
    return Buffer.from(value, 'base64');
  }
  if (encoding === 'quoted-printable') {
    if (/=(?![a-f\d]{2}|\r\n)/i.test(source) || /[^\x09\x20-\x7e\r\n]/.test(source)) throw failure('invalid_encoding');
    return Buffer.from(source.replace(/=\r\n/g, '').replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1');
  }
  if (!['7bit', '8bit'].includes(encoding) || (encoding === '7bit' && bytes.some(byte => byte > 127))) throw failure('invalid_encoding');
  return bytes;
}

function decodeText(bytes, charset = 'us-ascii') {
  if (!['utf-8', 'us-ascii'].includes(charset) || (charset === 'us-ascii' && bytes.some(byte => byte > 127))) throw failure('unsupported_charset');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) throw failure('invalid_text');
  return text;
}

function decodeSubject(value) {
  const decoded = value.replace(/\?=\s+(?==\?)/g, '?=').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, type, data) => {
    const bytes = decodeTransfer(Buffer.from(type.toLowerCase() === 'q' ? data.replace(/_/g, ' ') : data, 'ascii'), type.toLowerCase() === 'b' ? 'base64' : 'quoted-printable');
    return decodeText(bytes, charset.toLowerCase());
  });
  if (decoded.includes('=?')) throw failure('invalid_encoding');
  return decoded;
}

function contentType(value = 'text/plain; charset=us-ascii') {
  const sections = value.split(';').map(part => part.trim());
  const type = sections.shift().toLowerCase();
  const parameters = {};
  for (const section of sections) {
    const match = /^(charset|boundary)=(?:"([^"\\]+)"|([a-zA-Z0-9._+-]+))$/i.exec(section);
    if (!match || Object.hasOwn(parameters, match[1].toLowerCase())) throw failure('unsupported_mime');
    parameters[match[1].toLowerCase()] = match[2] || match[3];
  }
  return { type, ...parameters };
}

function parseMime(entity, state, depth = 0) {
  if (++state.parts > 20 || depth > 4) throw failure('mime_limit');
  const get = name => entity.headers.get(name)?.[0];
  if ([...entity.headers].some(([name, values]) => name.startsWith('content-') && values.length !== 1)) throw failure('duplicate_headers');
  const mime = contentType(get('content-type'));
  if (get('content-disposition') && get('content-disposition').toLowerCase() !== 'inline') { state.review = true; return []; }
  if (mime.type.startsWith('multipart/')) {
    // A single alternative pair can be automatic only if both views agree.
    // Mixed/nested content and attachments retain owner review.
    if (mime.type !== 'multipart/alternative' || depth !== 0) state.review = true;
    if (!['multipart/alternative', 'multipart/mixed'].includes(mime.type) || !mime.boundary || !/^[a-zA-Z0-9._+-]{1,70}$/.test(mime.boundary)
      || (get('content-transfer-encoding') && !['7bit', '8bit'].includes(get('content-transfer-encoding').toLowerCase()))) throw failure('unsupported_mime');
    const lines = entity.body.toString('latin1').split('\r\n');
    const parts = []; let current = null; let closed = false;
    for (const line of lines) {
      if (line === `--${mime.boundary}` || line === `--${mime.boundary}--`) {
        if (current) parts.push(current.join('\r\n'));
        if (parts.length > 20) throw failure('mime_limit');
        current = []; if (line.endsWith('--')) { closed = true; break; }
      } else if (current) current.push(line);
    }
    if (!closed || !parts.length) throw failure('unsupported_mime');
    return parts.flatMap(part => parseMime(splitEntity(Buffer.from(part, 'latin1')), state, depth + 1));
  }
  if (!['text/plain', 'text/html'].includes(mime.type)) { state.review = true; return []; }
  const text = decodeText(decodeTransfer(entity.body, (get('content-transfer-encoding') || '7bit').toLowerCase()), (mime.charset || 'us-ascii').toLowerCase());
  return [{ type: mime.type, text }];
}

function equivalentHtmlView(html, plain) {
  // A small, non-executing HTML subset, used only to prove two MIME views agree.
  // CSS, comments, hidden/active content, malformed tags and unknown entities
  // cannot acquire authority by being stripped into innocuous-looking text.
  const allowed = new Set(['html', 'body', 'div', 'p', 'br', 'a', 'span', 'b', 'strong', 'i', 'em', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li']);
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const decode = text => text.replace(/&([^;\s]{1,12});/g, (all, name) => {
    if (Object.hasOwn(entities, name)) return entities[name];
    if (/^#(?:[0-9]+|x[a-f\d]+)$/i.test(name)) {
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      if (code >= 32 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
    }
    throw failure('html_review');
  });
  try {
    let text = ''; let offset = 0; let tokens = 0;
    const links = []; const stack = [];
    for (const match of html.matchAll(/<[^>]*>|[^<]+/g)) {
      if (match.index !== offset || ++tokens > 2000) return false;
      const token = match[0]; offset += token.length;
      if (!token.startsWith('<')) { text += decode(token); continue; }
      const tag = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)(\/?)>$/.exec(token);
      if (!tag || !allowed.has(tag[2].toLowerCase())) return false;
      const name = tag[2].toLowerCase();
      if (tag[1]) { if (tag[3].trim() || tag[4] || stack.pop() !== name) return false; }
      else {
        let remaining = tag[3]; const attributes = new Set();
        while (remaining.trim()) {
          const attr = /^\s+([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(remaining);
          if (!attr) return false;
          const key = attr[1].toLowerCase();
          if (attributes.has(key) || !['href', 'title', 'lang', 'dir', 'class', 'target', 'rel', 'cellpadding', 'cellspacing', 'border', 'align'].includes(key)) return false;
          attributes.add(key);
          const value = decode(attr[2] ?? attr[3]);
          if (key === 'href') { if (name !== 'a' || !exactJobUrl(value)) return false; links.push(value); }
          if (key === 'dir' && value !== 'ltr') return false;
          remaining = remaining.slice(attr[0].length);
        }
        if (name === 'a' && !attributes.has('href')) return false;
        if (name !== 'br') { if (tag[4]) return false; stack.push(name); }
      }
      if (['div', 'p', 'br', 'tr', 'td', 'th', 'li', 'h1', 'h2', 'h3', 'h4'].includes(name)) text += '\n';
    }
    const comparable = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (offset !== html.length || stack.length || comparable(text) !== comparable(plain)) return false;
    const expected = [...new Set([...plain.matchAll(/https:\/\/[^\s<>"']+/g)].map(match => match[0]))].sort();
    const actual = [...new Set([...links, ...[...text.matchAll(/https:\/\/[^\s<>"']+/g)].map(match => match[0])])].sort();
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch { return false; }
}

function mailboxAddress(value) {
  const match = /^(?:[^<>@,;:"\\]+\s*<([^<>]+)>|([^<>\s]+))$/.exec(value || '');
  const address = match?.[1] || match?.[2] || '';
  return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address) ? address.toLowerCase() : '';
}

export function inspectApplicationRaw(raw) {
  if (typeof raw?.raw !== 'string' || raw.raw.length > Math.ceil(MAX_APPLICATION_RAW_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9_-]+={0,2}$/.test(raw.raw)) throw failure('raw_unavailable');
  const bytes = Buffer.from(raw.raw, 'base64url');
  if (bytes.length > MAX_APPLICATION_RAW_BYTES || bytes.toString('base64url') !== raw.raw.replace(/=+$/, '')) throw failure('raw_limit');
  const entity = splitEntity(bytes);
  const get = name => entity.headers.get(name)?.[0] || '';
  const state = { parts: 0, review: false };
  let parts = []; let interpretationFailure = '';
  try { parts = parseMime(entity, state); }
  catch (error) { interpretationFailure = error.code || 'unsupported_mime'; }
  const plain = parts.filter(part => part.type === 'text/plain');
  const html = parts.filter(part => part.type === 'text/html');
  const alternative = get('content-type').toLowerCase().startsWith('multipart/alternative;');
  if (html.length && !(alternative && parts.length === 2 && plain.length === 1 && html.length === 1 && equivalentHtmlView(html[0].text, plain[0].text))) state.review = true;
  if (alternative && parts.length !== 2) state.review = true;
  const text = (plain.length ? plain : parts).map(part => part.type === 'text/html'
    ? part.text.replace(/<(script|style|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&') : part.text).join('\n');
  const current = currentMessageText(text);
  let subject = get('subject');
  try { subject = decodeSubject(subject); }
  catch { interpretationFailure = 'invalid_encoding'; }
  const message = { subject: subject.slice(0, 500), sender: get('from').slice(0, 500), text: current,
    links: [...`${subject}\n${current}`.matchAll(/https:\/\/[^\s<>"']+/g)].map(match => match[0]).slice(0, 100), receivedAt: new Date(get('date')) };
  const signatures = entity.headers.get('dkim-signature') || [];
  let reason = interpretationFailure;
  if (reason) { /* Keep bounded header metadata for owner review only. */ }
  else if (CRITICAL.some(name => (entity.headers.get(name)?.length || 0) > 1)) reason = 'duplicate_headers';
  else if (['from', 'to', 'subject', 'date', 'message-id', 'mime-version', 'content-type'].some(name => !get(name))) reason = 'missing_headers';
  else if (signatures.length < 1 || signatures.length > 4) reason = 'signature_count';
  else if (signatures.some(value => /(?:^|;)\s*l\s*=/i.test(value))) reason = 'limited_body';
  else if (state.review || plain.length !== 1) reason = 'mime_review';
  else if (get('mime-version') !== '1.0' || subject.length > 500) reason = 'ambiguous_headers';
  else if ([...entity.headers.keys()].some(name => name.startsWith('resent-')) || get('sender')) reason = 'ambiguous_sender';
  else if (/^\s*>|^--\s*$|\bOn .{0,200}wrote:|-----Original Message-----|^From:/im.test(text)) reason = 'quoted_content';
  else if (!mailboxAddress(get('from')) || !mailboxAddress(get('to')) || !/^<[^<>\s]+@[^<>\s]+>$/.test(get('message-id'))) reason = 'invalid_identity';
  return { bytes, message, headers: entity.headers, sender: mailboxAddress(get('from')), recipient: mailboxAddress(get('to')), reason,
    // Preserve candidates from Gmail's acknowledgement search even when strict
    // interpretation cannot recover their body. This flag permits review only;
    // the unchanged failure reason still excludes automatic authentication.
    reviewRequired: ['unsupported_charset', 'unsupported_mime'].includes(interpretationFailure) };
}

// This is deliberately stricter than the suggestion matcher. Query strings and
// tenant paths are identity, not redirect hints; no normalization of job IDs.
function exactJobUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || /%|\\/.test(value)) return null;
    return url;
  } catch { return null; }
}

export async function authenticateApplicationMessage(raw, mailbox, applications, { rules = applicationMailTrustRules(), verify = verifyApplicationDkim, now = new Date() } = {}) {
  let inspected;
  const pending = reason => ({ message: inspected?.message || null, applicationId: null, trust: { status: 'pending', reason } });
  try { inspected = inspectApplicationRaw(raw); } catch (error) { return pending(error.code || 'invalid_raw'); }
  const { message, bytes, headers, sender, recipient, reason } = inspected;
  if (reason) return pending(reason);
  if (recipient !== mailbox.toLowerCase() || !Number.isFinite(message.receivedAt.getTime()) || message.receivedAt > new Date(now.getTime() + 300000)) return pending('invalid_recipient_or_date');
  if (!isAcknowledgement(message)) return pending('not_acknowledgement');
  const links = [...new Set(message.links)];
  if (links.length !== 1) return pending('ambiguous_job');
  const receiptParagraph = message.text.split(/\r?\n[\t ]*\r?\n/).find(paragraph => paragraph.includes(links[0]) && isAcknowledgement({ subject: '', text: paragraph }));
  if (!receiptParagraph || receiptParagraph.length > 2000) return pending('detached_job_link');
  const link = exactJobUrl(links[0]);
  const exact = applications.filter(item => link && exactJobUrl(item.jobSnapshot?.applicationUrl)?.href === link.href);
  if (exact.length !== 1) return pending('job_identity');
  const selected = exact[0];
  const text = ` ${normalize(`${message.subject} ${message.text}`)} `;
  const contains = value => normalize(value).length >= 3 && text.includes(` ${normalize(value)} `);
  if (!contains(selected.jobSnapshot.company) || !contains(selected.jobSnapshot.title)
    || !normalize(receiptParagraph).includes(normalize(selected.jobSnapshot.company)) || !normalize(receiptParagraph).includes(normalize(selected.jobSnapshot.title))
    || applications.some(item => String(item._id) !== String(selected._id) &&
      ((normalize(item.jobSnapshot?.company) !== normalize(selected.jobSnapshot.company) && contains(item.jobSnapshot?.company))
      || (normalize(item.jobSnapshot?.title) !== normalize(selected.jobSnapshot.title) && contains(item.jobSnapshot?.title))))) return pending('contradictory_job');
  const eligibleRules = Array.isArray(rules) ? rules.filter(rule => {
    if (!rule || normalize(rule.company) !== normalize(selected.jobSnapshot.company) || rule.sender !== sender || typeof rule.signingDomain !== 'string') return false;
    const origin = exactJobUrl(rule.origin);
    return origin && origin.origin === rule.origin && origin.origin === link.origin && /^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(rule.tenantPath || '') && link.pathname.startsWith(rule.tenantPath);
  }) : [];
  if (!eligibleRules.length) return pending('unknown_rule');
  let result;
  try { result = await verify(bytes); } catch (error) { return pending(['verification_timeout', 'verifier_unavailable', 'verifier_busy'].includes(error.code) ? error.code : 'verification_failed'); }
  if (!Array.isArray(result?.headerFrom) || result.headerFrom.length !== 1 || result.headerFrom[0].toLowerCase() !== sender) return pending('sender_mismatch');
  const valid = result.results?.find(signature => {
    const signed = new Set(signature.signingHeaders?.keys?.map(name => name.toLowerCase()) || []);
    return signature.status?.result === 'pass' && !signature.status?.testing && !signature.status?.warnings?.length
      && ['rsa-sha256', 'ed25519-sha256'].includes(signature.algo) && signature.signatureTimeValid === true
      && signature.canonBodyLengthLimited === false && /^[a-f\d]{64}$/i.test(signature.id || '')
      && CRITICAL.filter(name => headers.has(name)).every(name => signed.has(name))
      && eligibleRules.some(rule => rule.signingDomain === signature.signingDomain);
  });
  if (!valid) return pending('signature_policy');
  return { message, applicationId: String(selected._id), trust: { status: 'authenticated', reason: 'authenticated',
    // Signed receipt identity is mailbox-scoped when stored. No raw mail or DNS
    // response is retained; signature digest is stable across Gmail deliveries.
    receipt: digest(`${valid.signingDomain}\n${valid.id}`), proof: digest(bytes), verifiedAt: new Date() } };
}

let activeVerifications = 0;
export async function verifyApplicationDkim(bytes, { timeoutMs = 3000, dnsRecords } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_APPLICATION_RAW_BYTES) throw failure('raw_limit');
  if (activeVerifications >= 2) throw failure('verifier_busy');
  activeVerifications++;
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./applicationMailDkimWorker.js', import.meta.url), { workerData: { bytes, dnsRecords },
        env: {}, execArgv: [], stdout: true, stderr: true, resourceLimits: { maxOldGenerationSizeMb: 48, maxYoungGenerationSizeMb: 8, stackSizeMb: 2 } });
      worker.stdout.resume(); worker.stderr.resume();
      let settled = false;
      const finish = (error, result) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        // Terminate before releasing the concurrency slot, including on timeout.
        worker.terminate().finally(() => error ? reject(error) : resolve(result));
      };
      const timer = setTimeout(() => finish(failure('verification_timeout')), Math.min(Math.max(timeoutMs, 1), 3000));
      worker.once('message', result => result.error ? finish(failure(result.error)) : finish(null, result));
      worker.once('error', () => finish(failure('verification_failed')));
      worker.once('exit', () => finish(failure('verification_failed')));
    });
  } finally { activeVerifications--; }
}
