import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/benchmarkDescriptionLatency.js', import.meta.url));

test('latency CLI records missing assets without network access or MongoDB', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'latency-cli-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const input = path.join(dir, 'jobs.json'), output = path.join(dir, 'report.json');
  await fs.writeFile(input, JSON.stringify([{ title: 'Engineer', sourceDescription: 'Build Python services.' }]));
  const result = await exec(process.execPath, [script, '--input', input, '--output', output, '--assets-dir', path.join(dir, 'missing')],
    { windowsHide: true, timeout: 10000, env: { ...process.env, MONGO_URI: 'must-not-connect' } }).catch(error => error);
  assert.equal(result.code, 2);
  const report = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.equal(report.status, 'blocked');
  assert.equal(report.errorCode, 'REWRITE_ASSETS_UNAVAILABLE');
  assert.equal(report.nativeInferenceExecuted, false);
  assert.deepEqual(report.configurations, []);
  assert.doesNotMatch(result.stdout + result.stderr, /Build Python|must-not-connect/);
});

test('GPU benchmark cannot silently use the pinned CPU package', async () => {
  const result = await exec(process.execPath, [script, '--input', 'unused.json', '--gpu-layers', 'all'],
    { windowsHide: true, timeout: 10000 }).catch(error => error);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /compatible binary.*checksum/i);
});
