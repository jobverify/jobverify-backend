import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { REWRITE_MODEL, buildRewriteInput, validateRewrite } from '../src/services/jobDescriptionPolicy.js';
import { createRewriteClient } from '../rewriting/runner.js';
import { prepareRewriteRuntime, startRewriteWorker, workerMemoryBytes } from '../rewriting/worker.js';

const option = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const inputFile = option('--input');
if (!inputFile) throw new Error('Use --input <JSON array of 20 employer-source jobs>. This benchmark never connects to MongoDB.');
const outputFile = path.resolve(option('--output') || '.cache/description-benchmark/report.json');
const jobs = JSON.parse(await fs.readFile(inputFile, 'utf8'));
if (!Array.isArray(jobs) || jobs.length !== 20) throw new Error('Benchmark requires exactly 20 representative jobs');
const controller = new AbortController();
for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => controller.abort());
const policyHash = createHash('sha256').update(await fs.readFile(new URL('../src/services/jobDescriptionPolicy.js', import.meta.url))).digest('hex');
const report = { model: REWRITE_MODEL, policyHash, environment: { platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, threads: 2, totalMemoryBytes: os.totalmem() }, startedAt: new Date().toISOString(), cases: [] };
if (process.argv.includes('--resume')) {
  const previous = JSON.parse(await fs.readFile(outputFile, 'utf8'));
  if (JSON.stringify(previous.model) !== JSON.stringify(REWRITE_MODEL) || previous.environment.platform !== process.platform || previous.environment.threads !== 2) throw new Error('Cannot resume a different model/runtime/platform configuration');
  if (!Array.isArray(previous.cases) || previous.cases.length > jobs.length) throw new Error('Invalid benchmark checkpoint');
  report.startedAt = previous.startedAt;
  report.resumedAt = new Date().toISOString();
  report.cases = previous.cases.map((row, index) => {
    const input = buildRewriteInput(jobs[index]);
    if (row.index !== index + 1 || row.inputHash !== input.inputHash) throw new Error('Cannot resume changed or reordered source jobs');
    const replay = row.finishReason === 'stop' && row.generatedSections ? validateRewrite({ sections: row.generatedSections }, input, row.finishReason) : null;
    return { ...row, generationPolicyHash: row.generationPolicyHash || previous.policyHash || 'unrecorded-initial-pilot',
      ...(replay && { accepted: replay.ok, reason: replay.reason, description: replay.description, validationPolicyHash: policyHash }) };
  });
}
const save = async () => { await fs.mkdir(path.dirname(outputFile), { recursive: true }); const temp = outputFile + '.tmp'; await fs.writeFile(temp, JSON.stringify(report, null, 2) + '\n'); await fs.rename(temp, outputFile); };
let worker;
try {
  const setupAt = Date.now();
  if (report.cases.length === jobs.length) { await save(); }
  else {
  worker = await startRewriteWorker({ ...await prepareRewriteRuntime({ signal: controller.signal }), signal: controller.signal, threads: 2 });
  report.setupMs = Date.now() - setupAt;
  const client = createRewriteClient(worker);
  const resumeCount = report.cases.length;
  for (const [index, job] of jobs.entries()) {
    if (index < resumeCount) continue;
    controller.signal.throwIfAborted();
    const input = buildRewriteInput(job), started = Date.now();
    let response, validation;
    try {
      response = await client.generate(input, { signal: controller.signal });
      validation = validateRewrite(response.value, input, response.finishReason);
    } catch (error) { validation = { ok: false, reason: error.name === 'TimeoutError' ? 'timeout' : 'generation_error' }; }
    const text = validation.description || response?.value?.sections?.flatMap(s => s.items?.map(i => i.text) || []).join(' ') || '';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const sentences = Math.max(1, (text.match(/[.!?](?:\s|$)/g) || []).length);
    const row = { index: index + 1, title: job.title, company: job.company, inputHash: input.inputHash, sourceWords: input.sourceWords, durationMs: Date.now() - started,
      generationPolicyHash: policyHash, validationPolicyHash: policyHash, accepted: validation.ok, reason: validation.reason, finishReason: response?.finishReason, wordCount, averageSentenceWords: Number((wordCount / sentences).toFixed(1)),
      workerMemoryBytes: await workerMemoryBytes(worker.pid).catch(() => null), usage: response?.usage, timings: response?.timings,
      description: validation.description, generatedSections: response?.value?.sections };
    report.cases.push(row); await save();
    console.log(JSON.stringify({ index: row.index, title: row.title, accepted: row.accepted, reason: row.reason, durationMs: row.durationMs, wordCount }));
  }
  }
} finally {
  report.finishedAt = new Date().toISOString();
  const durations = report.cases.map(row => row.durationMs).sort((a, b) => a - b);
  report.summary = { completed: report.cases.length, accepted: report.cases.filter(row => row.accepted).length,
    p50DurationMs: durations[Math.floor(durations.length / 2)] || null, maxWorkerMemoryBytes: Math.max(0, ...report.cases.map(row => row.workerMemoryBytes || 0)),
    review: 'Automated evidence, numeric, qualifier and repetition checks are proxies. Review accepted sections against the source before judging factual preservation and readability. Memory is the worker process peak resident working set, where available; null means measurement unavailable.' };
  await worker?.stop(); await save();
}
