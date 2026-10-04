import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createJobClassifier } from '../scraper-support/utils/jobClassifier.js';
import { CLASSIFICATION_MODEL, CLASSIFICATION_POLICY, POLICY_HASH, RUNTIME_HASH } from '../src/services/jobClassificationPolicy.js';
import * as classificationPolicy from '../src/services/jobClassificationPolicy.js';
import { normalizeScrapedJob } from '../scraper-support/utils/normalizeScrapedJob.js';
import { saveDryRunSnapshot } from '../scraper-support/utils/saveToDB.js';

const identity = { modelRevision: CLASSIFICATION_MODEL.revision, runtimeVersion: CLASSIFICATION_MODEL.runtimeVersion, runtimeHash: RUNTIME_HASH, policyHash: POLICY_HASH, calibrationHash: 'uncalibrated' };
const now = new Date('2026-10-03T12:00:00Z');
const job = { title: 'Engineering Intern', company: 'Example', location: 'Bengaluru, India', country: 'India', description: 'Internship for currently enrolled students.', link: 'https://example.com/jobs/one' };
const response = value => ({ ok: true, status: 200, json: async () => value });
const answers = Object.fromEntries(Object.entries(CLASSIFICATION_POLICY.questions).map(([key, question]) => {
  const labels = Object.keys(question.criteria), choice = labels[0];
  return [key, { choice, probabilities: Object.fromEntries(labels.map(label => [label, label === choice ? .99 : .01 / (labels.length - 1)])) }];
}));
const ready = () => response({ ready: true, identity });
const complete = () => response({ complete: true, windows: 1, answers, identity });

test('stored employer qualifications retain the exact complete scan input after normalization', () => {
  for (const minimumQualification of ['Required skills:\nExperience with cloud systems.', 'Approx. 3\u202fyears of experience\u202fin HR IT.',
    ['Required skills', 'Experience with cloud systems']]) {
    const source = { ...job, minimumQualification, preferredQualification: 'Banking\u00a0experience preferred.\nSQL knowledge.',
      sourceEmploymentType: 'Full\u202ftime', sourceExperienceRequired: '3\u202fyears' };
    const original = classificationPolicy.buildClassificationInput(source, { now });
    const classification = classificationPolicy.resolveClassification(source, { complete: true, windows: 1, answers, identity }, { now, mode: 'policy' });
    const stored = normalizeScrapedJob({ ...source, classification });
    assert.equal(classificationPolicy.buildClassificationInput(stored, { now }).inputHash, original.inputHash);
    assert.equal(classificationPolicy.buildClassificationInput(normalizeScrapedJob(stored), { now }).inputHash, original.inputHash);
  }
});

const seedNative = (directory, { inputJob = job, at = now, scanIdentity = identity, prediction = { complete: true, windows: 1, answers, identity: scanIdentity } } = {}) => {
  const input = classificationPolicy.buildClassificationInput(inputJob, { now: at, identity: scanIdentity });
  const record = { formatVersion: 1, nativeRuntimeHash: classificationPolicy.NATIVE_RUNTIME_HASH,
    inputHash: input.inputHash, completedAt: at.toISOString(), prediction };
  const folder = path.join(directory, '.native', String(classificationPolicy.NATIVE_RUNTIME_HASH), scanIdentity.runtimeHash);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, `${input.inputHash}.json`), JSON.stringify(record));
  return record;
};

test('complete native probabilities survive deletion of the derived semantic decision', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-replay-'));
  let calls = 0;
  const fetch = async url => url.endsWith('/health') ? ready() : (++calls, complete());
  try {
    const [first] = await createJobClassifier({ mode: 'policy', cacheDirectory, fetch }).classifyJobs([job], { now });
    fs.rmSync(path.join(cacheDirectory, `${first.classification.inputHash}.json`));
    const [replayed] = await createJobClassifier({ mode: 'policy', cacheDirectory, fetch }).classifyJobs([job], { now });
    assert.equal(calls, 1, 'an identical complete native scan should not be repeated');
    assert.equal(replayed.classification.nativeScan.reused, true);
    assert.deepEqual(replayed.classification.nativeScan.identity, identity);
    assert.equal(first.classification.nativeScan.reused, false);
  } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('a prior resolver scan is reused with its original identity and a current rule decision', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-prior-'));
  const oldIdentity = { ...identity, runtimeHash: 'a'.repeat(64) };
  let calls = 0;
  try {
    const record = seedNative(cacheDirectory, { scanIdentity: oldIdentity });
    const [result] = await createJobClassifier({ mode: 'policy', cacheDirectory,
      fetch: async url => url.endsWith('/health') ? ready() : (++calls, complete()),
    }).classifyJobs([job], { now });
    assert.equal(calls, 0);
    assert.equal(result.classification.runtimeHash, RUNTIME_HASH);
    assert.notEqual(result.classification.inputHash, record.inputHash);
    assert.equal(result.classification.nativeScan.inputHash, record.inputHash);
    assert.deepEqual(result.classification.nativeScan.identity, oldIdentity);
    assert.equal(result.classification.nativeScan.reused, true);
    assert.equal(normalizeScrapedJob(result).jobType, 'Intern');
  } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('native reuse cannot bypass a current healthy worker or the human enforcement gate', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-gate-'));
  try {
    seedNative(cacheDirectory);
    await assert.rejects(createJobClassifier({ mode: 'policy', cacheDirectory, retryAfterMs: 0,
      fetch: async () => { throw new Error('offline'); },
    }).classifyJobs([job], { now }), { name: 'LayaClassificationRequiredError' });
    await assert.rejects(createJobClassifier({ mode: 'enforce', cacheDirectory, retryAfterMs: 0, fetch: async () => ready(),
    }).classifyJobs([job], { now }), /human evaluation gate/);
  } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('a warm required client rechecks worker health before reusing a second source batch', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-health-refresh-'));
  let available = true;
  try {
    const classifier = createJobClassifier({ mode: 'policy', cacheDirectory, retryAfterMs: 0,
      fetch: async url => { if (!available) throw new Error('worker stopped'); return url.endsWith('/health') ? ready() : complete(); },
    });
    await classifier.classifyJobs([job], { now });
    available = false;
    await assert.rejects(classifier.classifyJobs([job], { now }), { name: 'LayaClassificationRequiredError' });
  } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('a warm enforce client rechecks the human gate before native-cache replay', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-enforce-refresh-'));
  const calibrated = { ...identity, calibrationHash: 'c'.repeat(64) };
  let allowed = true;
  const second = { ...job, description: 'Research internship for current students.' };
  try {
    seedNative(cacheDirectory, { inputJob: second, scanIdentity: calibrated });
    const classifier = createJobClassifier({ mode: 'enforce', cacheDirectory, retryAfterMs: 0, fetch: async url => response(url.endsWith('/health')
      ? { ready: true, identity: calibrated, enforceAllowed: allowed }
      : { complete: true, windows: 1, answers, identity: calibrated }),
    });
    await classifier.classifyJobs([job], { now });
    allowed = false;
    await assert.rejects(classifier.classifyJobs([second], { now }), /human evaluation gate/);
  } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('native cache misses when source facts, year, model, questions or calibration change', async t => {
  for (const [name, inputJob, at, scanIdentity] of [
    ['body', { ...job, description: 'An internship with different qualifications.' }, now, identity],
    ['title', { ...job, title: 'Research Intern' }, now, identity],
    ['cohort', { ...job, eligibleBatches: [2025], eligibleBatchesProvenance: 'source' }, now, identity],
    ['year', job, new Date('2027-01-01T00:00:00Z'), identity],
    ['model', job, now, { ...identity, modelRevision: 'b'.repeat(40) }],
    ['questions', job, now, { ...identity, policyHash: 'b'.repeat(64) }],
    ['calibration', job, now, { ...identity, calibrationHash: 'b'.repeat(64) }],
  ]) await t.test(name, async () => {
    const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-invalidation-'));
    let calls = 0;
    try {
      seedNative(cacheDirectory, { inputJob, at, scanIdentity });
      const [result] = await createJobClassifier({ mode: 'policy', cacheDirectory,
        fetch: async url => url.endsWith('/health') ? ready() : (++calls, complete()),
      }).classifyJobs([job], { now });
      assert.equal(calls, 1);
      assert.equal(result.classification.nativeScan.reused, false);
    } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
  });
});

test('malformed native probabilities and partial scans are never reused', async t => {
  for (const [name, mutate] of [
    ['missing answer', p => { delete p.answers.leadership; }],
    ['invalid sum', p => { p.answers.employment.probabilities[p.answers.employment.choice] = .3; }],
    ['unknown choice', p => { p.answers.experience.choice = 'made-up'; }],
    ['non-numeric probability', p => { p.answers.seniority.probabilities[p.answers.seniority.choice] = '.99'; }],
    ['fractional windows', p => { p.windows = 1.5; }],
    ['incomplete', p => { p.complete = false; }],
    ['deadline', p => { p.reason = 'request_deadline'; }],
    ['mismatched identity', p => { p.identity.calibrationHash = 'b'.repeat(64); }],
  ]) await t.test(name, async () => {
    const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-native-invalid-'));
    try {
      const prediction = JSON.parse(JSON.stringify({ complete: true, windows: 1, answers, identity }));
      mutate(prediction);
      seedNative(cacheDirectory, { prediction });
      await assert.rejects(createJobClassifier({ mode: 'policy', cacheDirectory, retryAfterMs: 0,
        fetch: async url => url.endsWith('/health') ? ready() : response({ ok: false }),
      }).classifyJobs([job], { now }), { name: 'LayaClassificationRequiredError' });
    } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
  });
});

test('required live responses need integer windows and cannot claim complete after a deadline', async t => {
  for (const [name, extra] of [['fractional windows', { windows: 1.5 }], ['deadline', { reason: 'request_deadline' }]]) {
    await t.test(name, async () => {
      const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 0, fetch: async url => url.endsWith('/health') ? ready()
        : response({ complete: true, windows: 1, answers, identity, ...extra }) });
      await assert.rejects(classifier.classifyJobs([job], { now }), { name: 'LayaClassificationRequiredError' });
    });
  }
});

test('progress distinguishes complete scans from policy labels and unresolved model guesses', async () => {
  const progress = [];
  const classifier = createJobClassifier({ mode: 'policy', fetch: async url => url.endsWith('/health') ? ready() : complete() });
  const result = await classifier.classifyJobs([job, { ...job, title: 'Engineer', description: 'Build products.', link: 'https://example.com/jobs/two' },
    { ...job, title: 'Engineer', sourceEmploymentType: 'Full Time', description: 'Build products.', link: 'https://example.com/jobs/three' }],
    { now, onProgress: event => progress.push(event) });
  assert.deepEqual(result.map(job => job.classification.decisionSource), ['policy', 'fallback', 'policy']);
  const last = progress.at(-1);
  assert.equal(last.nativeComplete, 3);
  assert.equal(last.unscanned, 0);
  assert.equal(last.modelDecisions, 0);
  assert.equal(last.policyDecisions, 1);
  assert.equal(last.unresolved, 2);
});

test('policy mode rejects an unavailable worker instead of returning keyword-only jobs', async () => {
  const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 0, fetch: async () => { throw new Error('offline'); } });
  await assert.rejects(classifier.classifyJobs([job], { now }), error => error.name === 'LayaClassificationRequiredError' && error.reason === 'unavailable');
});

test('a nullable persistence signal still permits retrying a starting worker', async () => {
  let healthCalls = 0;
  const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 1, fetch: async url => {
    if (!url.endsWith('/health')) return complete();
    if (++healthCalls === 1) throw new Error('starting');
    return ready();
  } });
  const [result] = await classifier.classifyJobs([job], { now, signal: null });
  assert.equal(result.classification.complete, true);
  assert.equal(healthCalls, 2);
});

test('native local transport can wait for long scans without the fetch five-minute headers limit', async () => {
  const originalFetch = globalThis.fetch;
  const server = createServer((request, response) => {
    request.resume();
    const value = request.url === '/health' ? { ready: true, identity } : { complete: true, windows: 1, answers, identity };
    setTimeout(() => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(value)); }, 25);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let globalCalls = 0;
  globalThis.fetch = async () => { globalCalls++; throw new Error('global fetch has a shorter built-in header timeout'); };
  try {
    const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 0, endpoint: `http://127.0.0.1:${server.address().port}` });
    const [result] = await classifier.classifyJobs([job], { now });
    assert.equal(result.classification.complete, true);
    assert.equal(globalCalls, 0);
  } finally { globalThis.fetch = originalFetch; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('every new job is scanned after a transient busy worker, without cooldown skips', async () => {
  let attempts = 0;
  const bodies = [];
  const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 0, fetch: async (url, init) => {
    if (url.endsWith('/health')) return ready();
    bodies.push(JSON.parse(init.body).body);
    if (++attempts === 1) return { ok: false, status: 503 };
    return complete();
  } });
  const result = await classifier.classifyJobs([job, { ...job, description: 'Internship for bachelors students. Second vacancy.' }], { now });
  assert.equal(attempts, 3);
  assert.ok(result.every(job => job.classification.complete));
  assert.deepEqual(result.map(job => normalizeScrapedJob(job).experienceYears), [[0], [0]]);
  assert.match(bodies[2], /Second vacancy/);
});

test('recovered calibrated health supplies identity before input hashing and prediction', async () => {
  let healthCalls = 0;
  const calibrated = { ...identity, calibrationHash: 'b'.repeat(64) };
  const classifier = createJobClassifier({ mode: 'enforce', retryAfterMs: 0, fetch: async (url, init) => {
    if (url.endsWith('/health')) {
      if (++healthCalls === 1) throw new Error('starting');
      return response({ ready: true, identity: calibrated, enforceAllowed: true });
    }
    assert.deepEqual(JSON.parse(init.body).identity, calibrated);
    return response({ complete: true, windows: 1, answers, identity: calibrated });
  } });
  const [result] = await classifier.classifyJobs([job], { now });
  assert.equal(result.classification.complete, true);
  assert.equal(result.classification.calibrationHash, calibrated.calibrationHash);
  assert.equal(healthCalls, 2);
});

test('incomplete scans and oversized descriptions block a required source batch', async () => {
  let requests = 0;
  const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 0, fetch: async url => {
    if (url.endsWith('/health')) return ready();
    requests++;
    return response({ complete: false, windows: 1, reason: 'request_deadline', answers, identity });
  } });
  await assert.rejects(classifier.classifyJobs([job], { now }), { name: 'LayaClassificationRequiredError' });
  const attempted = requests;
  await assert.rejects(classifier.classifyJobs([{ ...job, description: 'x'.repeat(CLASSIFICATION_MODEL.maxInputBytes + 1) }], { now }), { name: 'LayaClassificationRequiredError' });
  assert.equal(requests, attempted, 'invalid input must not reach the worker');
});

test('durable complete scans survive interruption but changed content requires another pass', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-required-cache-'));
  let calls = 0;
  const fetch = async url => url.endsWith('/health') ? ready() : (++calls, complete());
  try {
    await createJobClassifier({ mode: 'policy', cacheDirectory, fetch }).classifyJobs([job], { now });
    const classifier = createJobClassifier({ mode: 'policy', cacheDirectory, fetch });
    const [cached] = await classifier.classifyJobs([job], { now });
    assert.equal(calls, 1);
    assert.equal(cached.classification.complete, true);
    await classifier.classifyJobs([{ ...job, description: 'Different internship requirements.' }], { now });
    assert.equal(calls, 2);
    await classifier.classifyJobs([job], { now: new Date('2027-01-01T00:00:00Z') });
    assert.equal(calls, 3, 'reference year must invalidate cached scans');
  } finally { fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('disk checkpoint failure does not discard an otherwise complete model scan', async () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-cache-full-'));
  const originalWrite = fs.writeFileSync;
  const errors = [];
  fs.writeFileSync = (file, ...args) => {
    if (String(file).startsWith(cacheDirectory + path.sep)) throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    return originalWrite(file, ...args);
  };
  try {
    const classifier = createJobClassifier({ mode: 'policy', cacheDirectory, onCacheError: error => errors.push(error.code),
      fetch: async url => url.endsWith('/health') ? ready() : complete(),
    });
    const [result] = await classifier.classifyJobs([job], { now });
    assert.equal(result.classification.complete, true);
    assert.deepEqual(errors, ['ENOSPC']);
  } finally { fs.writeFileSync = originalWrite; fs.rmSync(cacheDirectory, { recursive: true, force: true }); }
});

test('dry snapshot publication waits for the complete scan and blocks injected incomplete results', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-required-snapshot-'));
  const file = path.join(directory, 'jobs.json');
  const events = [];
  try {
    await assert.rejects(saveDryRunSnapshot([job], file, { enrichPublicExperience: false,
      classifier: { mode: 'policy', classifyJobs: async jobs => jobs.map(job => ({ ...job, classification: { complete: false } })) },
    }), /complete Laya/i);
    assert.equal(fs.existsSync(file), false);
    const classifier = createJobClassifier({ mode: 'policy', fetch: async url => {
      if (url.endsWith('/health')) return ready();
      assert.equal(fs.existsSync(file), false);
      events.push('model');
      return complete();
    } });
    await saveDryRunSnapshot([job], file, { now, enrichPublicExperience: false, classifier, onStage: event => {
      if (event.stage === 'snapshot write' && event.status === 'start') events.push('write');
    } });
    assert.deepEqual(events, ['model', 'write']);
    assert.equal(JSON.parse(fs.readFileSync(file))[0].jobType, 'Intern');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('classification failures keep a source pending, and a missing result cannot publish a partial batch', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-pending-source-'));
  const failure = new Error('classification processing failed');
  try {
    await assert.rejects(saveDryRunSnapshot([job], path.join(directory, 'jobs.json'), { enrichPublicExperience: false,
      classifier: { mode: 'policy', classifyJobs: async () => { throw failure; } },
    }), error => error === failure && error.classificationPending === true);
    await assert.rejects(saveDryRunSnapshot([job], path.join(directory, 'jobs.json'), { enrichPublicExperience: false,
      classifier: { mode: 'policy', classifyJobs: async () => [] },
    }), error => error.name === 'LayaClassificationRequiredError' && error.classificationPending);
    assert.equal(fs.existsSync(path.join(directory, 'jobs.json')), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
