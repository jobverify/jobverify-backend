import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import '../loadEnv.js';
import { configureMongoDns } from '../src/utils/mongoDns.js';
import Job from '../src/models/Job.js';
import { REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';
import { rewriteDeadline, rewriteStopDetails, rewriteQueueQuery, rewriteQueuePages, rewriteFailureDetails, createRewriteClient, rewriteCandidates, probeRewriteClient, rewriteProgress } from '../rewriting/runner.js';
import { prepareRewriteRuntime, startRewriteWorker, workerMemoryBytes, rewriteWorkerConfiguration } from '../rewriting/worker.js';
import { createRewriteDiagnostics } from '../rewriting/diagnostics.js';
import { createProgressLogger } from './lib/progressLogger.js';

const apply = process.argv.includes('--apply');
const mode = process.env.JOB_DESCRIPTION_REWRITE_MODE || 'off';
const workerConfig = rewriteWorkerConfiguration({ threads: process.env.JOB_DESCRIPTION_REWRITE_CPU_THREADS || REWRITE_MODEL.cpuThreads,
  parallelism: process.env.JOB_DESCRIPTION_REWRITE_CONCURRENCY || 1 });
if (!['off', 'publish'].includes(mode)) throw new Error('JOB_DESCRIPTION_REWRITE_MODE must be off or publish');
const summary = { mode: apply ? mode : 'preview', modelId: REWRITE_MODEL.modelId, modelFile: REWRITE_MODEL.file,
  modelRevision: REWRITE_MODEL.revision, policyVersion: REWRITE_MODEL.policyVersion, outputFormat: REWRITE_MODEL.outputFormat,
  startedAt: new Date().toISOString(), environment: { platform: os.platform(), cpu: os.cpus()[0]?.model,
    availableCpus: os.availableParallelism(), cpuThreads: workerConfig.threads, parallelism: workerConfig.parallelism,
    contextTokensPerRequest: REWRITE_MODEL.contextTokens, maxOutputTokens: REWRITE_MODEL.maxOutputTokens,
    maxRetryOutputTokens: REWRITE_MODEL.maxRetryOutputTokens, maxModelEdits: REWRITE_MODEL.maxModelEdits,
    maxPromptCandidates: REWRITE_MODEL.maxPromptCandidates, maxEditCharacters: REWRITE_MODEL.maxEditCharacters, queuePageSize: 8,
    requestSeconds: REWRITE_MODEL.requestSeconds, totalMemoryBytes: os.totalmem() } };
const summaryFile = path.resolve(process.env.PIPELINE_SUMMARY_FILE || '.cache/scraper-actions/description-summary.json');
if (REWRITE_MODEL.outputFormat === 'prose') {
  for (const key of ['maxOutputTokens', 'maxRetryOutputTokens', 'maxModelEdits', 'maxPromptCandidates', 'maxEditCharacters', 'requestSeconds']) delete summary.environment[key];
  summary.environment.outputSizing = 'remaining_model_context';
  summary.environment.requestDeadline = 'remaining_workflow_budget';
}
const diagnosticFile = path.join(path.dirname(summaryFile), 'description-rejections.json');
const diagnostics = createRewriteDiagnostics();
const onRejection = rejection => diagnostics.record(rejection);
const deadline = rewriteDeadline({ budgetSeconds: process.env.JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS || 1200,
  workflowStartedAt: process.env.JOB_DESCRIPTION_WORKFLOW_STARTED_AT, workflowSeconds: process.env.JOB_DESCRIPTION_WORKFLOW_BUDGET_SECONDS || 9000 });
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
const budgetSignal = AbortSignal.timeout(Math.max(1, Math.floor(deadline - Date.now())));
const signal = AbortSignal.any([controller.signal, budgetSignal]);
let worker, jobs, phase = 'configuration';
const progress = createProgressLogger('rewrite', () => ({
  mode: summary.mode, queued: summary.queued, processed: summary.results?.length || 0,
  remaining: summary.queued === undefined ? undefined : Math.max(0, summary.queued - (summary.results?.length || 0)),
}));
const setPhase = value => { phase = value; progress.phase(value); };
try {
  setPhase('configuration');
  if (apply && mode !== 'publish') summary.reason = 'disabled';
  else if (Date.now() >= deadline) summary.reason = 'workflow_budget_exhausted';
  else {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    configureMongoDns();
    setPhase('connect');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: Math.max(1, Math.min(15000, deadline - Date.now())) });
    const query = rewriteQueueQuery();
    setPhase('count_queue');
    summary.queued = await Job.countDocuments(query).maxTimeMS(15000);
    if (!apply || !summary.queued) summary.reason = apply ? 'empty_queue' : 'read_only_preview';
    else {
        signal.throwIfAborted();
        setPhase('prepare_runtime');
        const runtime = await prepareRewriteRuntime({ signal });
        setPhase('start_worker');
        worker = await startRewriteWorker({ ...runtime, signal, deadline,
          threads: workerConfig.threads, parallelism: workerConfig.parallelism });
        setPhase('probe_worker');
        summary.workerProbe = await probeRewriteClient(createRewriteClient(worker), { concurrency: worker.parallelism, deadline, signal, onRejection });
        setPhase('process_queue');
        jobs = rewriteQueuePages(Job, query, { pageSize: 8, deadline, signal });
        summary.results = [];
        Object.assign(summary, await rewriteCandidates(jobs, { client: createRewriteClient({ ...worker, planCacheDir: '.cache/description-rewrites' }), deadline, signal, concurrency: worker.parallelism, onRejection,
          update: async (filter, update) => {
            try { return await Job.updateOne(filter, update, { runValidators: true, maxTimeMS: 15000 }); }
            catch (error) { error.rewritePhase = 'update_job'; throw error; }
          },
          onResult: result => { summary.results.push(result); console.log(JSON.stringify(result)); },
        }));
    }
  }
} catch (error) {
  if (error.rewriteStats) Object.assign(summary, error.rewriteStats);
  const expectedStop = signal.aborted && (['AbortError', 'TimeoutError'].includes(error.name) || error === signal.reason);
  if (expectedStop) Object.assign(summary, rewriteStopDetails({ cancelled: controller.signal.aborted, budgetExpired: budgetSignal.aborted || Date.now() >= deadline }));
  else {
    summary.reason = 'worker_error';
    // Never hide a code/database/worker failure that coincides with the deadline.
    Object.assign(summary, rewriteFailureDetails(error, error.rewritePhase || phase));
    process.exitCode = 1;
  }
} finally {
  // Stop the heartbeat even if worker or database cleanup fails.
  progress.stop();
  setPhase('cleanup');
  await jobs?.return();
  if (worker) summary.worker = worker.diagnostics();
  if (worker) summary.workerMemoryBytes = await workerMemoryBytes(worker.pid).catch(() => null);
  await worker?.stop();
  await mongoose.disconnect();
  if (summary.results?.length) {
    const durations=summary.results.filter(r=>r.generated && !r.modelPlanCached && r.durationMs>0).map(r=>r.durationMs).sort((a,b)=>a-b);
    const seconds=(Date.now()-Date.parse(summary.startedAt))/1000;
    summary.capacity={elapsedSeconds:seconds,modelRequests:summary.results.reduce((total,r)=>total+(r.generationRequests??(r.generated&&!r.modelPlanCached?1:0)),0),attemptsPerHour:summary.attempted ? summary.attempted/seconds*3600 : 0,p50DurationMs:durations[Math.floor(durations.length*.5)]||null,p95DurationMs:durations[Math.min(durations.length-1,Math.floor(durations.length*.95))]||null};
    summary.capacity.renderedWithoutInference = summary.results.filter(result => result.ok && result.renderedWithoutInference).length;
    summary.capacity.modelEditedItems = summary.results.reduce((total, result) => total + (result.ok ? result.quality?.modelEditedItems || 0 : 0), 0);
    summary.capacity.sourceCopiedItems = summary.results.reduce((total, result) => total + (result.ok ? result.quality?.sourceCopiedItems || 0 : 0), 0);
  }
  if (apply && summary.queued !== undefined) Object.assign(summary, rewriteProgress(summary));
  if (apply && !summary.errorType && summary.reason !== 'disabled') Object.assign(summary,
    rewriteStopDetails({ cancelled: controller.signal.aborted, budgetExpired: budgetSignal.aborted || Date.now() >= deadline || summary.reason === 'workflow_budget_exhausted' }));
  summary.finishedAt = new Date().toISOString();
  if (apply) {
    const { stageOutcome, describeStageCompletion } = await import('../src/pipeline/policy.js');
    summary.outcome = stageOutcome('rewrite', summary, process.exitCode || 0);
    Object.assign(summary, describeStageCompletion('rewrite', summary, summary.outcome));
    if (summary.outcome !== 'completed') process.exitCode = 1;
  }
  await fs.mkdir(path.dirname(summaryFile), { recursive: true });
  if (apply) {
    const rejected = diagnostics.snapshot();
    summary.rejectionDiagnostics = { file: path.basename(diagnosticFile), totalRejected: rejected.totalRejected,
      sampleCount: rejected.samples.length, reasons: rejected.reasons, maxSamples: rejected.maxSamples, maxBytes: rejected.maxBytes };
    await fs.writeFile(diagnosticFile + '.tmp', JSON.stringify(rejected) + '\n');
    await fs.rename(diagnosticFile + '.tmp', diagnosticFile);
  }
  await fs.writeFile(summaryFile + '.tmp', JSON.stringify(summary, null, 2) + '\n');
  await fs.rename(summaryFile + '.tmp', summaryFile);
  console.log(JSON.stringify({ ...summary, results: summary.results?.length }));
}
