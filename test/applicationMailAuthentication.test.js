import assert from 'node:assert/strict';
import test from 'node:test';

const auth = await import('../src/services/applicationMailAuthentication.js').catch(() => ({}));
const url = 'https://jobs.example.test/acme/jobs/123';
const applications = [{ _id: 'job-123', jobSnapshot: { company: 'Acme Inc', title: 'Backend Engineer', applicationUrl: url } }];
const rules = [{ company: 'Acme Inc', sender: 'hiring@example.test', signingDomain: 'example.test', origin: 'https://jobs.example.test', tenantPath: '/acme/jobs/' }];
const body = `Thank you for applying to Acme Inc for Backend Engineer.\r\n${url}\r\n`;
const headers = ['From: Hiring <hiring@example.test>', 'To: candidate@example.test', 'Subject: Application received', 'Date: Fri, 30 Oct 2026 08:00:00 +0000', 'Message-ID: <receipt@example.test>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit', 'DKIM-Signature: v=1; a=rsa-sha256; d=example.test; s=fixture; h=from:to:subject:date:message-id:mime-version:content-type:content-transfer-encoding; bh=fixture; b=fixture'];
const envelope = (lines = headers, text = body) => ({ id: 'gmail-1', raw: Buffer.from(lines.join('\r\n') + '\r\n\r\n' + text).toString('base64url') });
// This double exercises the policy boundary only. It is not cryptographic evidence.
const signature = () => ({ headerFrom: ['hiring@example.test'], results: [{ id: 'a'.repeat(64), signingDomain: 'example.test', algo: 'rsa-sha256', signatureTimeValid: true, canonBodyLengthLimited: false, signingHeaders: { keys: ['from', 'to', 'subject', 'date', 'message-id', 'mime-version', 'content-type', 'content-transfer-encoding'] }, status: { result: 'pass' } }] });
const assess = (raw = envelope(), options = {}) => auth.authenticateApplicationMessage(raw, 'candidate@example.test', applications, { rules, verify: async () => signature(), now: new Date('2026-10-30T09:00:00Z'), ...options });

test('authentication policy binds one exact job to a configured employer, sender, signature and tenant', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function', 'The RAW authentication boundary must exist');
  const result = await assess();
  assert.equal(result.applicationId, 'job-123');
  assert.equal(result.trust.reason, 'authenticated');
  assert.equal(result.message.sender, 'Hiring <hiring@example.test>');
  assert.equal(result.message.receivedAt.toISOString(), '2026-10-30T08:00:00.000Z');
});

test('injected auth headers and missing, partial or weak signatures cannot authorize changes', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function');
  for (const change of [
    result => { result.results[0].status.result = 'fail'; },
    result => { result.results[0].canonBodyLengthLimited = true; },
    result => { result.results[0].algo = 'rsa-sha1'; },
    result => { result.results[0].signatureTimeValid = false; },
    result => { result.results[0].signingDomain = 'shared-ats.test'; },
    result => { result.results[0].signingHeaders.keys = ['from']; },
    result => { result.headerFrom = ['attacker@example.test']; },
  ]) {
    const result = await assess(envelope([...headers, 'Authentication-Results: gmail.com; dkim=pass header.d=example.test']), { verify: async () => { const result = signature(); change(result); return result; } });
    assert.equal(result.applicationId, null);
  }
  assert.equal((await assess(envelope(headers.filter(line => !line.startsWith('DKIM-'))))).applicationId, null);
  assert.equal((await assess(envelope(headers.map(line => line.startsWith('DKIM-') ? line + '; l=0' : line)))).applicationId, null);
});

test('unknown rules, wrong identity, tenant and ambiguous or quoted job clues stay pending', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function');
  assert.equal((await assess(envelope(), { rules: [] })).applicationId, null);
  for (const rule of [ { ...rules[0], sender: 'other@example.test' }, { ...rules[0], company: 'Other Company' }, { ...rules[0], tenantPath: '/other/' }, { ...rules[0], origin: 'https://other.test' } ]) {
    assert.equal((await assess(envelope(), { rules: [rule] })).applicationId, null);
  }
  for (const text of [body.replace('/123', '/999'), body + 'https://jobs.example.test/acme/jobs/456', body.replace('Backend Engineer', 'Sales Manager'), body.replace(url, '> ' + url), body.replace(url, '-- \r\n' + url), body + '\r\nOn Friday someone wrote:\r\n' + url]) {
    assert.equal((await assess(envelope(headers, text))).applicationId, null, text);
  }
  assert.equal((await assess(envelope(headers, body.replace(url, '\r\nOur other jobs:\r\n' + url)))).applicationId, null, 'A footer job link must not supply receipt identity');
  assert.equal((await assess(envelope(headers.map(line => line.startsWith('Subject:') ? 'Subject: Application received https://jobs.example.test/acme/jobs/456' : line)))).applicationId, null);
});

test('the real worker bounds timeout and concurrency and does not expose dependency failures', async () => {
  assert.equal(typeof auth.verifyApplicationDkim, 'function');
  const bytes = Buffer.from(envelope().raw, 'base64url');
  await assert.rejects(auth.verifyApplicationDkim(bytes, { timeoutMs: 1, dnsRecords: {} }), { code: 'verification_timeout' });
  const first = auth.verifyApplicationDkim(bytes, { timeoutMs: 1, dnsRecords: {} });
  const second = auth.verifyApplicationDkim(bytes, { timeoutMs: 1, dnsRecords: {} });
  const third = auth.verifyApplicationDkim(bytes, { timeoutMs: 1, dnsRecords: {} });
  const results = await Promise.allSettled([first, second, third]);
  assert.deepEqual(results.map(result => result.reason.code), ['verification_timeout', 'verification_timeout', 'verifier_busy']);
});

test('duplicate critical headers, malformed encodings and resource excess stay pending', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function');
  for (const extra of ['From: attacker@example.test', 'To: other@example.test', 'Subject: Another subject', 'Date: Thu, 29 Oct 2026 08:00:00 +0000', 'Content-Type: text/html', 'Content-Transfer-Encoding: base64', 'Message-ID: <different@example.test>']) {
    assert.equal((await assess(envelope([...headers, extra]))).applicationId, null, extra);
  }
  assert.equal((await assess({ id: 'bad', raw: 'not a base64url payload!!' })).applicationId, null);
  assert.equal((await assess(envelope(headers, 'x'.repeat(600000)))).applicationId, null);
  assert.equal((await assess(envelope([...headers, ...Array(5).fill(headers.at(-1))]))).applicationId, null);
  assert.equal((await assess(envelope(headers.map(line => line.startsWith('To:') ? 'To: other@example.test' : line)))).applicationId, null);
});

test('base64, quoted printable and UTF-8 encoded words classify the same original bytes', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function');
  for (const [encoding, text] of [['base64', Buffer.from(body).toString('base64')], ['quoted-printable', body.replace('https:', 'https=3A')]]) {
    const lines = headers.map(line => line.startsWith('Content-Transfer-Encoding:') ? `Content-Transfer-Encoding: ${encoding}` : line.startsWith('Subject:') ? 'Subject: =?UTF-8?B?QXBwbGljYXRpb24gcmVjZWl2ZWQg4pyT?=' : line);
    const result = await assess(envelope(lines, text));
    assert.equal(result.applicationId, 'job-123');
    assert.equal(result.message.subject, 'Application received ✓');
  }
  const invalid = headers.map(line => line.startsWith('Content-Transfer-Encoding:') ? 'Content-Transfer-Encoding: quoted-printable' : line);
  assert.equal((await assess(envelope(invalid, body + '=GG'))).applicationId, null);
});

test('MIME alternatives are available for review but inconsistent interpretation is never automatic', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function');
  const lines = headers.filter(line => !line.startsWith('Content-Transfer-Encoding:')).map(line => line.startsWith('Content-Type:') ? 'Content-Type: multipart/alternative; boundary="receipt"' : line);
  const mime = `--receipt\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n--receipt\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Different job</p>\r\n--receipt--\r\n`;
  const result = await assess(envelope(lines, mime));
  assert.equal(result.applicationId, null);
  assert.match(result.message.text, /Thank you for applying/);
});

test('matching bounded plain and HTML MIME alternatives preserve authenticated automatic matching', async () => {
  const lines = headers.filter(line => !line.startsWith('Content-Transfer-Encoding:')).map(line => line.startsWith('Content-Type:') ? 'Content-Type: multipart/alternative; boundary="receipt"' : line);
  const html = `<html><body><p>Thank you for applying to Acme Inc for Backend Engineer.<br><a href="${url}">${url}</a></p></body></html>`;
  const mime = markup => `--receipt\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(body).toString('base64')}\r\n--receipt\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${markup.replace(/=/g, '=3D')}\r\n--receipt--\r\n`;
  assert.equal((await assess(envelope(lines, mime(html)))).applicationId, 'job-123');
  for (const markup of [html.replace('/123"', '/456"'), html.replace('<p>', '<p hidden>'), html.replace('<p>', '<p style="display:none">'), html.replace('<p>', '<blockquote>'), html.replace('<p>', '<script>'), html.replace('Backend Engineer', 'Sales Manager'), html.replace('Thank you', '&gt; Thank you')]) {
    assert.equal((await assess(envelope(lines, mime(markup)))).applicationId, null, markup);
  }
});

test('verifier exceptions and timeouts are pending, never authenticated', async () => {
  assert.equal(typeof auth.authenticateApplicationMessage, 'function');
  for (const code of ['verification_timeout', 'verifier_unavailable', 'DNS_FAILURE']) {
    const result = await assess(envelope(), { verify: async () => { throw Object.assign(new Error('Private raw data must not be stored'), { code }); } });
    assert.equal(result.applicationId, null);
    assert.ok(!JSON.stringify(result.trust).includes('Private raw'));
  }
});
