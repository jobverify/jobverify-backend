import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { REWRITE_MODEL, buildRewriteInput } from '../src/services/jobDescriptionPolicy.js';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/benchmarkJobDescriptions.js', import.meta.url));
const job = { title: 'Engineer', company: 'Example', sourceDescription: 'Build and maintain Python services for customer applications. Design reliable APIs and collaborate with engineering teams. At least 2 years of software development experience is required.' };
const jobs = Array.from({ length: 20 }, (_, index) => ({ ...job, title: 'Engineer ' + index }));
const checkpoint = () => ({ model: REWRITE_MODEL, environment: { platform: process.platform, threads: 2 }, startedAt: '2026-10-02T00:00:00Z',
  cases: jobs.map((job, index) => ({ index: index + 1, inputHash: buildRewriteInput(job).inputHash, durationMs: 100, accepted: false, reason: 'timeout' })),
});

test('a completed benchmark checkpoint is reported without loading a model or regenerating jobs', async t => {
  const cwd = await fs.mkdtemp(path.join(tmpdir(), 'description-benchmark-checkpoint-'));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  const input = path.join(cwd, 'input.json'), output = path.join(cwd, 'report.json');
  await fs.writeFile(input, JSON.stringify(jobs)); await fs.writeFile(output, JSON.stringify(checkpoint()));
  await exec(process.execPath, [script, '--input', input, '--output', output, '--resume'], { cwd, windowsHide: true });
  const result = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.equal(result.summary.completed, 20);
  assert.equal(result.startedAt, '2026-10-02T00:00:00Z');
  assert.equal(result.setupMs, undefined);
  assert.equal(result.cases[0].generationPolicyHash, 'unrecorded-initial-pilot');
});

test('benchmark resume rejects changed source jobs before starting any model', async t => {
  const cwd = await fs.mkdtemp(path.join(tmpdir(), 'description-benchmark-reject-'));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  const input = path.join(cwd, 'input.json'), output = path.join(cwd, 'report.json');
  await fs.writeFile(input, JSON.stringify([{ ...jobs[0], company: 'Changed' }, ...jobs.slice(1)]));
  await fs.writeFile(output, JSON.stringify(checkpoint()));
  await assert.rejects(exec(process.execPath, [script, '--input', input, '--output', output, '--resume'], { cwd, windowsHide: true }), error => /changed or reordered/.test(error.stderr));
});
