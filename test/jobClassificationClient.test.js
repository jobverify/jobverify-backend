import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobClassifier } from '../scraper-support/utils/jobClassifier.js';
import { normalizeScrapedJob } from '../scraper-support/utils/normalizeScrapedJob.js';
import { buildClassificationInput, CLASSIFICATION_MODEL, CLASSIFICATION_POLICY, POLICY_HASH, RUNTIME_HASH } from '../src/services/jobClassificationPolicy.js';

const identity = { modelRevision: CLASSIFICATION_MODEL.revision, runtimeVersion: CLASSIFICATION_MODEL.runtimeVersion, runtimeHash: RUNTIME_HASH, policyHash: POLICY_HASH, calibrationHash: 'uncalibrated' };
const now = new Date('2026-10-02T12:00:00Z');
const job = { title: 'Engineer', description: 'Develop software.' };
const response = value => ({ ok: true, status: 200, json: async () => value });

test('display normalization preserves the classifier input and avoids a second model pass', () => {
  const source = { title: 'Analyst', source: 'test', company: 'Example', postingDate: '2026-10-01', jobDescription: 'Freshers with post-graduation or 2 - 3 years of experience. Work with PowerPoint.' };
  assert.equal(buildClassificationInput(source, { now }).inputHash,
    buildClassificationInput(normalizeScrapedJob(source), { now }).inputHash);
});

test('worker receives employer experience separately from the windowed description', async () => {
  const client = createJobClassifier({ mode: 'shadow', fetch: async (url, options) => {
    if (url.endsWith('/health')) return response({ ready: true, identity, enforceAllowed: false });
    const input = JSON.parse(options.body);
    assert.equal(input.sourceExperienceRequired, '3-5');
    assert.equal(input.sourceFields, undefined);
    return response({ complete: false, windows: 0, answers: {}, identity });
  } });
  const [result] = await client.classifyJobs([{ ...job, sourceExperienceRequired: '3-5' }], { now });
  // An assertion inside fetch must not disappear into the client's conservative fallback.
  assert.equal(result.classification.reason, 'incomplete');
});

test('off mode never calls the worker', async () => {
  const client = createJobClassifier({ mode: 'off', fetch: () => assert.fail('worker called') });
  assert.deepEqual(await client.classifyJobs([job]), [job]);
});

test('retained source descriptions preserve an incoming numeric zero experience requirement', async () => {
  const saved = { ...job, fingerprint: 'one', sourceExperienceRequired: '3-5' };
  const incoming = { ...job, fingerprint: 'one', preserveExistingSourceContent: true, sourceExperienceRequired: 0 };
  const client = createJobClassifier({ mode: 'shadow', fetch: async (url, init) => {
    if (url.endsWith('/health')) return response({ ready: true, identity, enforceAllowed: false });
    assert.equal(JSON.parse(init.body).sourceExperienceRequired, '0');
    return response({ complete: false, windows: 0, answers: {}, identity });
  } });
  const [result] = await client.classifyJobs([incoming], { now, existingJobs: [saved], keyForJob: record => record.fingerprint });
  assert.equal(result.sourceExperienceRequired, 0);
  assert.equal(result.classification.reason, 'incomplete');
});

test('shadow health handshake and compatible persisted decisions avoid repeat inference', async () => {
  let predictions = 0;
  const client = createJobClassifier({ mode: 'shadow', fetch: async url => url.endsWith('/health')
    ? response({ ready: true, identity, enforceAllowed: false })
    : (predictions++, response({ complete: false, windows: 0, answers: {}, identity })) });
  const first = (await client.classifyJobs([job], { now }))[0];
  assert.equal(first.classification.mode, 'shadow');
  // Failed/incomplete results are retried, not treated as successful persisted cache entries.
  await client.classifyJobs([first], { now });
  assert.equal(predictions, 2);
});

test('enforcement fails closed when evaluation release is missing', async () => {
  const client = createJobClassifier({ mode: 'enforce', fetch: async () => response({ ready: true, identity, enforceAllowed: false }) });
  await assert.rejects(client.classifyJobs([job], { now }), /evaluation gate/);
});

test('worker outage in shadow mode does not change public category or fail source saving', async () => {
  const client = createJobClassifier({ mode: 'shadow', fetch: async () => { throw new Error('offline'); } });
  const result = (await client.classifyJobs([job], { now }))[0];
  assert.equal(result.classification.status, 'fallback');
  assert.equal(result.classification.authoritative, false);
});

test('cancelled classification propagates abort instead of swallowing source cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  const client = createJobClassifier({ mode: 'shadow', fetch: async () => assert.fail('called') });
  await assert.rejects(client.classifyJobs([job], { signal: controller.signal }), { name: 'AbortError' });
});

test('a fully compatible accepted decision is reused across runs', async () => {
  const previous = { ...job, classification: { ...buildClassificationInput(job, { now, identity }), complete: true, status: 'accepted', mode: 'shadow', authoritative: false, policyVersion: CLASSIFICATION_POLICY.version, resolved: { jobType: 'Unspecified' } } };
  const client = createJobClassifier({ mode: 'shadow', fetch: async url => {
    assert.ok(url.endsWith('/health'));
    return response({ ready: true, identity, enforceAllowed: false });
  } });
  const result = (await client.classifyJobs([job], { now, existingJobs: [previous] }))[0];
  assert.equal(result.classification.inputHash, previous.classification.inputHash);
  assert.equal(result.classification.status, 'accepted');
});

test('a compatible prior decision survives a worker outage, but changed content does not', async () => {
  const previous = { ...job, fingerprint: 'same', classification: { ...buildClassificationInput(job, { now, identity }), complete: true, status: 'accepted', mode: 'shadow', authoritative: false, policyVersion: CLASSIFICATION_POLICY.version, resolved: { jobType: 'Unspecified' } } };
  const client = createJobClassifier({ mode: 'shadow', fetch: async () => { throw new Error('offline'); } });
  const options = { now, existingJobs: [previous], keyForJob: () => 'same' };
  const [result] = await client.classifyJobs([job], options);
  assert.equal(result.classification.status, 'accepted');
  const [changed] = await client.classifyJobs([{ ...job, description: 'Changed requirements.' }], options);
  assert.equal(changed.classification.status, 'fallback');
});

test('fully inspected uncertain decisions are reused without repeated inference', async () => {
  const previous = { ...job, classification: { ...buildClassificationInput(job, { now, identity }), complete: true, status: 'uncertain', reason: 'uncertain', mode: 'shadow', authoritative: false, policyVersion: CLASSIFICATION_POLICY.version, resolved: { jobType: 'Unspecified' } } };
  const client = createJobClassifier({ mode: 'shadow', fetch: async url => {
    assert.ok(url.endsWith('/health'));
    return response({ ready: true, identity });
  } });
  assert.equal((await client.classifyJobs([job], { now, existingJobs: [previous] }))[0].classification.status, 'uncertain');
});

test('prediction cache never shares rollback snapshots between different jobs', async () => {
  const make = (jobType, fingerprint) => ({ ...job, jobType, fingerprint });
  const existingJobs = [make('Contract', 'one'), make('Intern', 'two')];
  const answers = Object.fromEntries(Object.entries(CLASSIFICATION_POLICY.questions).map(([key, question]) => {
    const labels = Object.keys(question.criteria), choice = labels.at(-1);
    return [key, { choice, probabilities: Object.fromEntries(labels.map(label => [label, label === choice ? .999 : .001 / (labels.length - 1)])) }];
  }));
  const client = createJobClassifier({ mode: 'shadow', fetch: async url => url.endsWith('/health') ? response({ ready: true, identity })
    : response({ complete: true, windows: 1, identity, answers }) });
  const [one, two] = await client.classifyJobs(existingJobs, { now, existingJobs, keyForJob: record => record.fingerprint });
  assert.equal(one.classification.previous.jobType, 'Contract');
  assert.equal(two.classification.previous.jobType, 'Intern');
  assert.equal(client.stats.cached, 1);
});

test('a shadow-to-enforce upgrade snapshots the current baseline', async () => {
  const liveIdentity = { ...identity, calibrationHash: 'a'.repeat(64) };
  const existing = { ...job, fingerprint: 'one', jobType: 'Contract', classification: { previous: { jobType: 'Intern' }, mode: 'shadow', authoritative: false } };
  const client = createJobClassifier({ mode: 'enforce', fetch: async url => url.endsWith('/health') ? response({ ready: true, identity: liveIdentity, enforceAllowed: true })
    : response({ complete: true, windows: 1, identity: liveIdentity, answers: {} }) });
  const [result] = await client.classifyJobs([job], { now, existingJobs: [existing], keyForJob: () => 'one' });
  assert.equal(result.classification.previous.jobType, 'Contract');
});

test('persisted content cache reuses predictions without another job rollback fields', async () => {
  const saved = { ...job, fingerprint: 'one', jobType: 'Contract', classification: { ...buildClassificationInput(job, { now, identity }), complete: true, status: 'accepted', mode: 'shadow', authoritative: false, policyVersion: CLASSIFICATION_POLICY.version, resolved: { jobType: 'Unspecified' }, previous: { jobType: 'Contract' } } };
  const incoming = { ...job, fingerprint: 'two', jobType: 'Intern' };
  const client = createJobClassifier({ mode: 'shadow', fetch: async url => {
    assert.ok(url.endsWith('/health'));
    return response({ ready: true, identity });
  } });
  const [result] = await client.classifyJobs([incoming], { now, existingJobs: [saved], keyForJob: record => record.fingerprint });
  assert.equal(result.classification.status, 'accepted');
  assert.equal(result.classification.previous.jobType, normalizeScrapedJob(incoming).jobType);
  assert.notEqual(result.classification.previous.jobType, saved.classification.previous.jobType);
});

test('worker requests send source content once while retaining section boundaries', async () => {
  const client = createJobClassifier({ mode: 'shadow', fetch: async (url, init) => {
    if (url.endsWith('/health')) return response({ ready: true, identity });
    const input = JSON.parse(init.body);
    assert.equal(input.sourceFields, undefined);
    assert.match(input.body, /Preferred qualifications:\n5 years/);
    return response({ complete: false, windows: 0, answers: {}, identity });
  } });
  await client.classifyJobs([{ ...job, preferredQualification: '5 years preferred.' }], { now });
});

test('a timed-out worker cannot hold every remaining job in the batch and is retried after cooldown', async () => {
  let clock = 0, predictions = 0;
  const progress = [];
  const client = createJobClassifier({ mode: 'policy', clock: () => clock, retryAfterMs: 100,
    fetch: async url => {
      if (url.endsWith('/health')) return response({ ready: true, identity });
      if (++predictions === 1) throw new DOMException('slow CPU forward', 'TimeoutError');
      return response({ complete: true, windows: 1, answers: {}, identity });
    },
  });
  const jobs = Array.from({ length: 100 }, (_, index) => ({ title: 'Engineering Intern', description: `Internship for currently enrolled bachelor students. Posting reference REF${index}.` }));
  const result = await client.classifyJobs(jobs, { now, onProgress: event => progress.push(event) });
  assert.equal(result.length, 100);
  assert.equal(result[0].classification.reason, 'timeout');
  assert.equal(result[99].classification.reason, 'worker_cooldown');
  assert.ok(result.every(job => normalizeScrapedJob(job).jobType === 'Intern'));
  assert.ok(result.every(job => job.classification.complete === false));
  assert.equal(predictions, 1, 'remaining jobs must not repeat the failed model wait');
  assert.equal(progress.at(-1).processed, 100);
  clock = 101;
  const [recovered] = await client.classifyJobs([job], { now });
  assert.equal(recovered.classification.complete, true);
  assert.equal(predictions, 2);
});

test('a busy worker produces explicit fallback without a second retry for every job', async () => {
  let predictions = 0;
  const client = createJobClassifier({ mode: 'policy', fetch: async url => {
    if (url.endsWith('/health')) return response({ ready: true, identity });
    predictions++;
    return { ok: false, status: 503, json: async () => ({ error: 'busy' }) };
  } });
  const result = await client.classifyJobs([job, { ...job, title: 'Second Engineer' }], { now });
  assert.equal(result[0].classification.reason, 'busy');
  assert.equal(result[1].classification.reason, 'worker_cooldown');
  assert.equal(predictions, 1);
});

test('classification reports progress while the native request is still running', async () => {
  const progress = [];
  const client = createJobClassifier({ mode: 'policy', progressIntervalMs: 5, fetch: async url => {
    if (url.endsWith('/health')) return response({ ready: true, identity });
    await new Promise(resolve => setTimeout(resolve, 30));
    return response({ complete: true, windows: 1, answers: {}, identity });
  } });
  await client.classifyJobs([job], { now, onProgress: event => progress.push(event) });
  assert.ok(progress.filter(event => event.processed === 0).length > 1);
  assert.equal(progress.at(-1).processed, 1);
  assert.equal(progress.at(-1).nativeComplete, 1);
});

test('a native deadline overrun also pauses further model requests', async () => {
  let predictions = 0;
  const client = createJobClassifier({ mode: 'policy', fetch: async url => {
    if (url.endsWith('/health')) return response({ ready: true, identity });
    predictions++;
    return response({ complete: false, windows: 1, answers: {}, reason: 'request_deadline', identity });
  } });
  const result = await client.classifyJobs([job, { ...job, title: 'Second Engineer' }], { now });
  assert.equal(result[0].classification.reason, 'timeout');
  assert.equal(result[1].classification.reason, 'worker_cooldown');
  assert.equal(predictions, 1);
});

test('worker budget exhaustion is terminal for queued uncached requests in this run', async () => {
  let predictions = 0;
  const client = createJobClassifier({ mode: 'policy', fetch: async url => {
    if (url.endsWith('/health')) return response({ ready: true, identity });
    predictions++;
    return response({ complete: false, windows: 0, answers: {}, reason: 'budget_exhausted', identity });
  } });
  const result = await client.classifyJobs([job, { ...job, title: 'Second Engineer' }], { now });
  assert.ok(result.every(job => job.classification.reason === 'budget_exhausted'));
  assert.equal(client.stats.budgetSkipped, 2);
  assert.equal(predictions, 1);
});

test('initial health unavailability is retried on a later source after cooldown', async () => {
  let clock = 0, healthCalls = 0;
  const client = createJobClassifier({ mode: 'policy', clock: () => clock, retryAfterMs: 100, fetch: async url => {
    if (url.endsWith('/health')) {
      if (++healthCalls === 1) throw new Error('temporarily offline');
      return response({ ready: true, identity });
    }
    return response({ complete: true, windows: 1, answers: {}, identity });
  } });
  assert.equal((await client.classifyJobs([job], { now }))[0].classification.reason, 'unavailable');
  clock = 101;
  assert.equal((await client.classifyJobs([job], { now }))[0].classification.complete, true);
  assert.equal(healthCalls, 2);
});

test('cancelling the initial health handshake does not poison later sources', async () => {
  const controller = new AbortController();
  let healthCalls = 0;
  const client = createJobClassifier({ mode: 'policy', fetch: async url => {
    if (url.endsWith('/health')) {
      if (++healthCalls === 1) { controller.abort(); throw new DOMException('cancelled source', 'AbortError'); }
      return response({ ready: true, identity });
    }
    return response({ complete: true, windows: 1, answers: {}, identity });
  } });
  await assert.rejects(client.classifyJobs([job], { now, signal: controller.signal }), { name: 'AbortError' });
  assert.equal((await client.classifyJobs([job], { now }))[0].classification.complete, true);
});
