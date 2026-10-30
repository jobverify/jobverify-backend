import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { createRequire } from 'node:module';

export const jobUrl = 'https://jobs.example.test/acme/jobs/123';
export const trustRules = [{ company: 'Acme Inc', sender: 'hiring@example.test', signingDomain: 'example.test', origin: 'https://jobs.example.test', tenantPath: '/acme/jobs/' }];
const signedHeaders = ['from', 'to', 'subject', 'date', 'message-id', 'mime-version', 'content-type', 'content-transfer-encoding'];
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const dnsRecords = { 'fixture._domainkey.example.test': [[`v=DKIM1; k=rsa; p=${keys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')}`]] };
export const mailauthAvailable = (() => { try { return createRequire(import.meta.url)('mailauth/package.json').version === '8.0.4'; } catch { return false; } })();

// A generated RFC6376 simple/simple fixture, independently signed with Node
// crypto. Only real mailauth verification can establish its validity.
export function signedReceipt(id, { subject = 'Application received', text = `Thank you for applying to Acme Inc for Backend Engineer.\r\n${jobUrl}\r\n`, date = new Date(), contentType = 'text/plain; charset=utf-8', transferEncoding = '8bit' } = {}) {
  const headers = ['From: Hiring <hiring@example.test>', 'To: candidate@example.test', `Subject: ${subject}`, `Date: ${date.toUTCString()}`, 'Message-ID: <receipt@example.test>', 'MIME-Version: 1.0', `Content-Type: ${contentType}`, `Content-Transfer-Encoding: ${transferEncoding}`];
  const body = text.replace(/(?:\r\n)*$/, '\r\n');
  const dkim = `DKIM-Signature: v=1; a=rsa-sha256; c=simple/simple; d=example.test; s=fixture; h=${signedHeaders.join(':')}; bh=${createHash('sha256').update(body).digest('base64')}; b=`;
  const signature = sign('RSA-SHA256', Buffer.from(headers.join('\r\n') + '\r\n' + dkim), keys.privateKey).toString('base64');
  const bytes = Buffer.from([...headers, dkim + signature].join('\r\n') + '\r\n\r\n' + body);
  return { id, internalDate: String(date.getTime()), labelIds: ['INBOX'], raw: bytes.toString('base64url') };
}

// Explicitly a policy/DB integration double. Never label these crypto tests.
export async function policyVerifier(bytes) {
  const signature = /; b=([^\r\n]+)/.exec(bytes.toString())?.[1] || '';
  return { headerFrom: ['hiring@example.test'], results: [{ id: createHash('sha256').update(signature).digest('hex'), signingDomain: 'example.test', algo: 'rsa-sha256',
    signatureTimeValid: true, canonBodyLengthLimited: false, signingHeaders: { keys: signedHeaders }, status: { result: 'pass' } }] };
}
