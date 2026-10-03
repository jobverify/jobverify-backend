import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Job from '../src/models/Job.js';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/rewriteJobDescriptions.js', import.meta.url));

test('CLI preview only reads the eligible queue and never backfills or generates', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  const cwd = await fs.mkdtemp(path.join(tmpdir(), 'description-preview-'));
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); await fs.rm(cwd, { recursive: true, force: true }); });
  await mongoose.connect(mongo.getUri());
  await Job.insertMany(['pending', 'published', 'baseline', 'skipped', 'failed'].map((status, index) => ({
    title: 'Software Engineer', company: 'Example', fingerprint: 'cli-' + index, description: 'Employer source', sourceContentHash: 'source-' + index,
    descriptionRewrite: { status, attempts: status === 'failed' ? 3 : 0, nextAttemptAt: new Date(0), queuedAt: new Date() },
  })));
  const before = await Job.find().sort({ fingerprint: 1 }).lean();
  const { stdout } = await exec(process.execPath, [script], { cwd, windowsHide: true, env: { ...process.env, MONGO_URI: mongo.getUri(), JOB_DESCRIPTION_REWRITE_MODE: 'publish' } });
  const summary = JSON.parse(stdout.trim().split('\n').at(-1));
  assert.equal(summary.queued, 1);
  assert.equal(summary.reason, 'read_only_preview');
  assert.deepEqual(await Job.find().sort({ fingerprint: 1 }).lean(), before);
  assert.deepEqual(await fs.readdir(path.join(cwd, '.cache')), ['scraper-actions']);
});

test('disabled or exhausted CLI runs do not connect to MongoDB or start a model', async t => {
  const cwd = await fs.mkdtemp(path.join(tmpdir(), 'description-disabled-'));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  for (const [mode, budget, reason] of [['off', '1200', 'disabled'], ['publish', '0', 'workflow_budget_exhausted']]) {
    const { stdout } = await exec(process.execPath, [script, '--apply'], { cwd, windowsHide: true,
      env: { ...process.env, MONGO_URI: '', JOB_DESCRIPTION_REWRITE_MODE: mode, JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS: budget } });
    assert.equal(JSON.parse(stdout.trim().split('\n').at(-1)).reason, reason);
  }
});
