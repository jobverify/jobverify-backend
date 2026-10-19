import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import '../loadEnv.js';
import { configureMongoDns } from '../src/utils/mongoDns.js';
import Job from '../src/models/Job.js';
import { REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';
import { rewriteDeadline, rewriteQueueQuery, rewriteQueueScan, rewriteFailureDetails, createRewriteClient, rewriteCandidates } from '../rewriting/runner.js';
import { prepareRewriteRuntime, startRewriteWorker, workerMemoryBytes } from '../rewriting/worker.js';

const apply = process.argv.includes('--apply');
const mode = process.env.JOB_DESCRIPTION_REWRITE_MODE || 'off';
if (!['off', 'publish'].includes(mode)) throw new Error('JOB_DESCRIPTION_REWRITE_MODE must be off or publish');
const summary = { mode: apply ? mode : 'preview', modelRevision: REWRITE_MODEL.revision, policyVersion: REWRITE_MODEL.policyVersion, startedAt: new Date().toISOString(), environment: { platform: os.platform(), cpu: os.cpus()[0]?.model, availableCpus: os.availableParallelism(), cpuThreads: Number(process.env.JOB_DESCRIPTION_REWRITE_CPU_THREADS || REWRITE_MODEL.cpuThreads), totalMemoryBytes: os.totalmem() } };
const summaryFile = path.resolve(process.env.PIPELINE_SUMMARY_FILE || '.cache/scraper-actions/description-summary.json');
const deadline = rewriteDeadline({ budgetSeconds: process.env.JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS || 1200,
  workflowStartedAt: process.env.JOB_DESCRIPTION_WORKFLOW_STARTED_AT, workflowSeconds: process.env.JOB_DESCRIPTION_WORKFLOW_BUDGET_SECONDS || 9000 });
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
const budgetSignal = AbortSignal.timeout(Math.max(1, Math.floor(deadline - Date.now())));
const signal = AbortSignal.any([controller.signal, budgetSignal]);
let worker, cursor, phase = 'configuration';
try {
  if (apply && mode !== 'publish') summary.reason = 'disabled';
  else if (Date.now() >= deadline) summary.reason = 'workflow_budget_exhausted';
  else {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    configureMongoDns();
    phase = 'connect';
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: Math.max(1, Math.min(15000, deadline - Date.now())) });
    const query = rewriteQueueQuery();
    phase = 'count_queue';
    summary.queued = await Job.countDocuments(query).maxTimeMS(15000);
    if (!apply || !summary.queued) summary.reason = apply ? 'empty_queue' : 'read_only_preview';
    else {
        signal.throwIfAborted();
        phase = 'prepare_runtime';
        const runtime = await prepareRewriteRuntime({ signal });
        phase = 'start_worker';
        worker = await startRewriteWorker({ ...runtime, signal, deadline,
          threads: process.env.JOB_DESCRIPTION_REWRITE_CPU_THREADS || REWRITE_MODEL.cpuThreads });
        phase = 'process_queue';
        cursor = rewriteQueueScan(Job, query).cursor({ batchSize: 1 });
        summary.results = [];
        Object.assign(summary, await rewriteCandidates(cursor, { client: createRewriteClient({ ...worker, planCacheDir: '.cache/description-plans' }), deadline, signal,
          update: async (filter, update) => {
            phase = 'update_job';
            const result = await Job.updateOne(filter, update, { runValidators: true, maxTimeMS: 15000 });
            phase = 'process_queue';
            return result;
          },
          onResult: result => { summary.results.push(result); console.log(JSON.stringify(result)); },
        }));
    }
  }
} catch (error) {
  summary.reason = signal.aborted ? 'interrupted' : 'worker_error';
  // Keep diagnostics free of source text, connection strings, and model completions.
  Object.assign(summary, rewriteFailureDetails(error, phase));
  if (!signal.aborted) process.exitCode = 1;
} finally {
  await cursor?.close();
  if (worker) summary.workerMemoryBytes = await workerMemoryBytes(worker.pid).catch(() => null);
  await worker?.stop();
  await mongoose.disconnect();
  if (summary.results?.length) {
    const durations=summary.results.filter(r=>r.generated && !r.modelPlanCached && r.durationMs>0).map(r=>r.durationMs).sort((a,b)=>a-b);
    const seconds=(Date.now()-Date.parse(summary.startedAt))/1000;
    summary.capacity={elapsedSeconds:seconds,modelRequests:summary.results.filter(r=>r.generated&&!r.modelPlanCached).length,attemptsPerHour:summary.attempted ? summary.attempted/seconds*3600 : 0,p50DurationMs:durations[Math.floor(durations.length*.5)]||null,p95DurationMs:durations[Math.min(durations.length-1,Math.floor(durations.length*.95))]||null};
    summary.pendingEstimate=Math.max(0,(summary.queued||0)-(summary.published||0)-(summary.failed||0)-(summary.skipped||0));
  }
  summary.finishedAt = new Date().toISOString();
  if (apply) {
    const { stageOutcome } = await import('../src/pipeline/policy.js');
    summary.outcome = stageOutcome('rewrite', summary, process.exitCode || 0);
    if (summary.outcome !== 'completed') process.exitCode = 1;
  }
  await fs.mkdir(path.dirname(summaryFile), { recursive: true });
  await fs.writeFile(summaryFile + '.tmp', JSON.stringify(summary, null, 2) + '\n');
  await fs.rename(summaryFile + '.tmp', summaryFile);
  console.log(JSON.stringify({ ...summary, results: summary.results?.length }));
}
