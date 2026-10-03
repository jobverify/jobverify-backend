import { setTimeout as delay } from 'node:timers/promises';
import { buildClassificationInput, resolveClassification, snapshotClassificationFields, CLASSIFICATION_MODEL, CLASSIFICATION_POLICY, POLICY_HASH, RUNTIME_HASH } from '../../src/services/jobClassificationPolicy.js';
import { normalizeScrapedJob } from './normalizeScrapedJob.js';
import { getSourceDescription } from '../../src/utils/jobSourceContent.js';

const MODES = ['off', 'shadow', 'policy', 'enforce'];
const aborted = signal => { if (signal?.aborted) throw signal.reason?.name === 'AbortError' ? signal.reason : new DOMException('Classification cancelled', 'AbortError'); };
const localUrl = value => {
  const url = new URL(value || 'http://127.0.0.1:8765');
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Laya endpoint must be an unauthenticated HTTP URL on 127.0.0.1');
  return url.origin;
};
const compatibleIdentity = value => value?.modelRevision === CLASSIFICATION_MODEL.revision
  && value?.runtimeVersion === CLASSIFICATION_MODEL.runtimeVersion && value?.policyHash === POLICY_HASH
  && value?.runtimeHash === RUNTIME_HASH
  && typeof value?.calibrationHash === 'string' && (value.calibrationHash === 'uncalibrated' || /^[a-f0-9]{64}$/.test(value.calibrationHash));
const compatible = (classification, input, mode) => classification?.inputHash === input.inputHash
  && classification.mode === mode && classification.policyVersion === CLASSIFICATION_POLICY.version
  && classification.modelRevision === input.modelRevision && classification.runtimeVersion === input.runtimeVersion
  && classification.policyHash === input.policyHash && classification.runtimeHash === input.runtimeHash && classification.calibrationHash === input.calibrationHash
  && classification.referenceYear === input.referenceYear && classification.complete === true
  && ['accepted', 'uncertain'].includes(classification.status) && !['incomplete'].includes(classification.reason) && !!classification.resolved;

export const createJobClassifier = (options = {}) => {
  const mode = options.mode || process.env.JOB_CLASSIFICATION_MODE || 'off';
  if (!MODES.includes(mode)) throw new Error('JOB_CLASSIFICATION_MODE must be off, shadow, policy, or enforce');
  const endpoint = localUrl(options.endpoint || process.env.LAYA_ENDPOINT);
  const fetcher = options.fetch || globalThis.fetch;
  const requestMs = options.requestMs || (CLASSIFICATION_MODEL.requestSeconds + 2) * 1000;
  const clock = options.clock || Date.now;
  const retryAfterMs = options.retryAfterMs ?? 30000;
  let workerRetryAt = 0, budgetExhausted = false;
  let healthPromise, healthRetryAt = 0;
  let queue = Promise.resolve();
  const cache = new Map();
  const stats = { cached: 0, accepted: 0, uncertain: 0, fallback: 0, incomplete: 0, budgetSkipped: 0 };
  const request = async (path, init, signal, timeout = requestMs) => {
    aborted(signal);
    const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout);
    const response = await fetcher(`${endpoint}${path}`, { ...init, signal: combined });
    if (!response.ok) {
      const error = new Error(`Laya HTTP ${response.status}`);
      error.status = response.status;
      error.transient = response.status >= 500 && response.status !== 503;
      throw error;
    }
    const result = await response.json();
    aborted(signal);
    return result;
  };
  const health = async signal => {
    if (!healthPromise && clock() < healthRetryAt) return null;
    // A shared handshake must not inherit one source's cancellation signal.
    if (!healthPromise) healthPromise = request('/health', {}, undefined, 2000).then(result => {
      if (result.ready !== true || !compatibleIdentity(result.identity)) throw new Error('Incompatible Laya runtime');
      if (mode === 'enforce' && (result.enforceAllowed !== true || result.identity.calibrationHash === 'uncalibrated')) {
        const error = new Error('Laya enforcement requires a passed human evaluation gate');
        error.gate = true;
        throw error;
      }
      return result;
    }).catch(error => {
      healthPromise = undefined;
      if (error.gate) throw error;
      healthRetryAt = error.name === 'AbortError' || signal?.aborted ? 0 : clock() + retryAfterMs;
      return null;
    });
    const result = await healthPromise;
    aborted(signal);
    return result;
  };
  const predict = async (input, signal) => {
    // Section boundaries are already in body. Avoid sending the same description twice.
    const { sourceFields: _sourceFields, ...wireInput } = input;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await request('/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...wireInput, identity: { modelRevision: input.modelRevision, runtimeVersion: input.runtimeVersion, runtimeHash: input.runtimeHash, policyHash: input.policyHash, calibrationHash: input.calibrationHash } }) }, signal);
        if (!compatibleIdentity(result.identity) || result.identity.calibrationHash !== input.calibrationHash) throw new Error('Incompatible Laya response');
        return result;
      } catch (error) {
        aborted(signal);
        if (attempt || !error.transient) throw error;
        await delay(300, undefined, { signal });
      }
    }
  };
  const classifyJobs = async (jobs, { signal, now = new Date(), existingJobs = [], keyForJob, onProgress } = {}) => {
    if (mode === 'off') return jobs;
    aborted(signal);
    const runtime = await health(signal);
    const identity = runtime?.identity || {};
    const thresholds = runtime?.thresholds || CLASSIFICATION_POLICY.thresholds;
    const byHash = new Map(existingJobs.filter(job => job.classification?.inputHash).map(job => [job.classification.inputHash, job]));
    const byKey = keyForJob ? new Map(existingJobs.map(job => [keyForJob(job), job])) : new Map();
    const classified = [];
    let nativeComplete = 0;
    const report = () => {
      // Progress reporting must not turn a timer callback into an uncaught source failure.
      try { onProgress?.({ processed: classified.length, total: jobs.length, nativeComplete, fallback: classified.length - nativeComplete }); } catch {}
    };
    const append = result => { classified.push(result); nativeComplete += Number(result.classification?.complete === true); report(); };
    const heartbeat = typeof onProgress === 'function' ? setInterval(report, options.progressIntervalMs || 15000) : null;
    heartbeat?.unref();
    report();
    try {
    for (const incoming of jobs) {
      aborted(signal);
      const existingByKey = keyForJob && byKey.get(keyForJob(incoming));
      const job = incoming.preserveExistingSourceContent === true && existingByKey ? {
        ...incoming,
        sourceDescription: getSourceDescription(existingByKey),
        description: getSourceDescription(existingByKey) || incoming.description,
        jobDescription: getSourceDescription(existingByKey) || incoming.jobDescription,
        minimumQualification: existingByKey.minimumQualification || incoming.minimumQualification,
        preferredQualification: existingByKey.preferredQualification || incoming.preferredQualification,
        sourceEmploymentType: incoming.sourceEmploymentType || existingByKey.sourceEmploymentType,
        sourceExperienceRequired: [incoming.sourceExperienceRequired, existingByKey.sourceExperienceRequired]
          .find(value => value !== null && value !== undefined && value !== ''),
        eligibleBatches: incoming.eligibleBatches?.length ? incoming.eligibleBatches : existingByKey.eligibleBatches,
        eligibleBatchesProvenance: incoming.eligibleBatches?.length ? incoming.eligibleBatchesProvenance : existingByKey.eligibleBatchesProvenance,
        postedAt: existingByKey.postedAt || incoming.postedAt,
      } : incoming;
      const prior = existingByKey?.classification || job.classification;
      const inputIdentity = !runtime && compatibleIdentity(prior) ? {
        modelRevision: prior.modelRevision, runtimeVersion: prior.runtimeVersion, runtimeHash: prior.runtimeHash,
        policyHash: prior.policyHash, calibrationHash: prior.calibrationHash,
      } : identity;
      const input = buildClassificationInput(job, { now, identity: inputIdentity });
      const existing = existingByKey || byHash.get(input.inputHash);
      const old = existing?.classification || job.classification;
      const ownOld = existingByKey?.classification || job.classification;
      const baseline = existingByKey || normalizeScrapedJob(job);
      const previous = ownOld?.authoritative === true && ownOld.previous ? snapshotClassificationFields(ownOld.previous) : snapshotClassificationFields(baseline);
      if (compatible(old, input, mode)) {
        stats.cached++;
        append({ ...job, classification: existingByKey || old === job.classification ? old : { ...old, previous } });
        continue;
      }
      let decision = cache.get(input.inputHash);
      if (decision) { stats.cached++; decision = { ...decision, previous }; }
      else {
        const run = async () => {
          aborted(signal);
          let prediction = null, reason;
          if (!runtime) reason = 'unavailable';
          else if (input.incomplete) reason = 'incomplete';
          else if (budgetExhausted) reason = 'budget_exhausted';
          else if (clock() < workerRetryAt) reason = 'worker_cooldown';
          else {
            try {
              prediction = await predict(input, signal);
              if (prediction.reason === 'request_deadline') {
                reason = 'timeout';
                workerRetryAt = clock() + retryAfterMs;
              }
            }
            catch (error) {
              aborted(signal);
              reason = error.name === 'TimeoutError' ? 'timeout' : error.status === 503 ? 'busy' : 'unavailable';
              // The Python forward can outlive a client timeout. Let the pipeline proceed
              // while it finishes, then retry on a later job instead of waiting per row.
              workerRetryAt = clock() + retryAfterMs;
            }
          }
          if (prediction?.reason === 'budget_exhausted') { budgetExhausted = true; reason = 'budget_exhausted'; }
          if (reason === 'budget_exhausted') stats.budgetSkipped++;
          const resolved = resolveClassification(job, prediction, { now, mode, identity: inputIdentity, thresholds, reason, previous });
          stats[resolved.status]++;
          if (resolved.reason === 'incomplete') stats.incomplete++;
          if (resolved.complete && ['accepted', 'uncertain'].includes(resolved.status)) {
            const { previous: _previous, ...semanticDecision } = resolved;
            cache.set(input.inputHash, semanticDecision);
            if (cache.size > 5000) cache.delete(cache.keys().next().value);
          }
          return resolved;
        };
        const work = queue.then(run);
        queue = work.catch(() => {});
        decision = await work;
      }
      append({ ...job, classification: decision });
    }
    return classified;
    } finally { if (heartbeat) clearInterval(heartbeat); }
  };
  return { mode, classifyJobs, stats };
};

let shared;
export const getJobClassifier = () => shared ||= createJobClassifier();
