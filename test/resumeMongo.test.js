import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Resume from '../src/models/Resume.js';
import User from '../src/models/User.js';
import { MAX_RESUME_BYTES } from '../src/utils/resumeFile.js';

test('private resumes round-trip through HTTP and MongoDB without changing document bytes', { timeout: 90000 }, async t => {
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'resume-storage-integration-test-secret-only';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  const mongo = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  let server;
  t.after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri(), { dbName: 'resume_storage_test' });
  const user = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  await User.collection.insertMany([{ _id: user, email: 'resume@example.test', role: 'user', sessionVersion: 0 }, { _id: other, email: 'other@example.test', role: 'user', sessionVersion: 0 }]);
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const csrfResponse = await fetch(`${base}/api/auth/csrf-token`, { headers: { Origin: process.env.CORS_ORIGIN } });
  const { token: csrf } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  function request(path = '/api/user/resume', { method = 'GET', owner = user, body, filename, withCsrf = true, type = 'application/octet-stream' } = {}) {
    const token = owner ? `jobverify_token=${jwt.sign({ id: owner.toString(), sessionVersion: 0 }, process.env.JWT_SECRET)}` : '';
    return fetch(`${base}${path}`, { method, body, headers: {
      Origin: process.env.CORS_ORIGIN, Cookie: `${token}; ${csrfCookie}`, 'Content-Type': type,
      ...(filename ? { 'X-Resume-Filename': encodeURIComponent(filename) } : {}), ...(withCsrf ? { 'X-CSRF-Token': csrf } : {}),
    } });
  }
  assert.equal((await request(undefined, { owner: null })).status, 401);
  assert.equal((await (await request()).json()).data, null);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(65536, 32), Buffer.from('\n%%EOF')]);
  assert.equal((await request(undefined, { method: 'PUT', body: pdf, filename: 'Résumé.pdf', withCsrf: false })).status, 403);
  assert.equal((await request(undefined, { method: 'PUT', body: pdf, filename: 'Résumé.pdf', owner: null })).status, 401);
  const upload = await request(undefined, { method: 'PUT', body: pdf, filename: 'Résumé.pdf' });
  assert.equal(upload.status, 200, await upload.clone().text());
  const metadata = (await upload.json()).data;
  assert.equal(metadata.filename, 'Résumé.pdf');
  assert.equal(metadata.size, pdf.length);
  assert.equal(metadata.data, undefined);
  assert.equal((await Resume.findById(user).lean()).data, undefined, 'binary content is excluded from ordinary queries');
  assert.equal((await (await request()).json()).data.filename, 'Résumé.pdf');
  const download = await request('/api/user/resume/download');
  assert.equal(download.headers.get('content-type'), 'application/pdf');
  assert.match(download.headers.get('content-disposition'), /^attachment;/);
  assert.equal(download.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
  assert.equal((await request('/api/user/resume/download', { owner: other })).status, 404);
  await request(undefined, { method: 'DELETE', owner: other });
  assert.equal(await Resume.countDocuments({ user }), 1);

  for (const [filename, body] of [['wrong.pdf', Buffer.from('not a PDF')], ['resume.exe', pdf], ['resume.pdf', Buffer.alloc(MAX_RESUME_BYTES + 1)]]) {
    const rejected = await request(undefined, { method: 'PUT', body, filename });
    if (body.length > MAX_RESUME_BYTES) {
      assert.equal(rejected.status, 413);
      assert.equal((await rejected.json()).message, 'Your resume must be 500 KB or smaller.');
    } else assert.ok([400, 415].includes(rejected.status));
    assert.equal((await (await request()).json()).data.sha256, metadata.sha256, 'failed replacement keeps the current resume');
  }
  assert.equal((await request('/api/user/profile', { method: 'PUT', body: pdf })).status, 415, 'binary uploads cannot bypass JSON validation on other endpoints');
  const latex = Buffer.from('\\documentclass{article}\n\\begin{document}My resume\\end{document}');
  const replacement = await request(undefined, { method: 'PUT', body: latex, filename: 'resume.tex' });
  assert.equal(replacement.status, 200);
  assert.equal(await Resume.countDocuments({ user }), 1);
  assert.deepEqual(Buffer.from(await (await request('/api/user/resume/download')).arrayBuffer()), latex);
  assert.equal((await request(undefined, { method: 'DELETE' })).status, 200);
  assert.equal((await (await request()).json()).data, null);
  assert.equal((await request('/api/user/resume/download')).status, 404);
});
