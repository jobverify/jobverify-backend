import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import mongoose from 'mongoose';
import '../loadEnv.js';
import { configureMongoDns } from '../src/utils/mongoDns.js';
import Job from '../src/models/Job.js';
import { REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';
import { rewriteDeadline, rewriteQueueQuery, createRewriteClient, rewriteCandidates } from '../rewriting/runner.js';
import { prepareRewriteRuntime, startRewriteWorker } from '../rewriting/worker.js';

const apply = process.argv.includes('--apply');
const mode = process.env.JOB_DESCRIPTION_REWRITE_MODE || 'off';
if (!['off', 'publish'].includes(mode)) throw new Error('JOB_DESCRIPTION_REWRITE_MODE must be off or publish');
const summary = { mode: apply ? mode : 'preview', modelRevision: REWRITE_MODEL.revision, policyVersion: REWRITE_MODEL.policyVersion, startedAt: new Date().toISOString() };
const summaryFile = path.resolve('.cache/scraper-actions/description-summary.json');
const deadline = rewriteDeadline({ budgetSeconds: process.env.JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS || 1200,
  workflowStartedAt: process.env.JOB_DESCRIPTION_WORKFLOW_STARTED_AT, workflowSeconds: 9000 });
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
const budgetSignal = AbortSignal.timeout(Math.max(1, Math.floor(deadline - Date.now())));
const signal = AbortSignal.any([controller.signal, budgetSignal]);
let worker, cursor;
try {
  if (apply && mode !== 'publish') summary.reason = 'disabled';
  else if (Date.now() >= deadline) summary.reason = 'workflow_budget_exhausted';
  else {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    configureMongoDns();
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: Math.max(1, Math.min(15000, deadline - Date.now())) });
    const query = rewriteQueueQuery();
    summary.queued = await Job.countDocuments(query).maxTimeMS(15000);
    if (!apply || !summary.queued) summary.reason = apply ? 'empty_queue' : 'read_only_preview';
    else {
      // Do not start a second model if Laya remains alive after its cleanup step.
      let layaAlive = false;
      const layaStopDeadline = Math.min(deadline, Date.now() + 10000);
      do {
        try { await fetch('http://127.0.0.1:8765/health', { signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]) }); layaAlive = true; } catch { layaAlive = false; }
        if (layaAlive && Date.now() < layaStopDeadline) await delay(200, undefined, { signal });
        else break;
      } while (!signal.aborted);
      if (layaAlive) summary.reason = 'laya_still_running';
      else {
        signal.throwIfAborted();
        worker = await startRewriteWorker({ ...await prepareRewriteRuntime({ signal }), signal, deadline,
          threads: process.env.JOB_DESCRIPTION_REWRITE_CPU_THREADS || 2 });
        cursor = Job.find(query).sort({ 'descriptionRewrite.queuedAt': 1, _id: 1 }).lean().cursor({ batchSize: 1 });
        summary.results = [];
        Object.assign(summary, await rewriteCandidates(cursor, { client: createRewriteClient(worker), deadline, signal,
          update: (filter, update) => Job.updateOne(filter, update, { runValidators: true, maxTimeMS: 15000 }),
          onResult: result => { summary.results.push(result); console.log(JSON.stringify(result)); },
        }));
      }
    }
  }
} catch (error) {
  summary.reason = signal.aborted ? 'interrupted' : 'worker_error';
  // Keep diagnostics free of source text, connection strings, and model completions.
  summary.errorType = error.name;
  if (!signal.aborted) process.exitCode = 1;
} finally {
  await cursor?.close();
  await worker?.stop();
  await mongoose.disconnect();
  summary.finishedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(summaryFile), { recursive: true });
  await fs.writeFile(summaryFile + '.tmp', JSON.stringify(summary, null, 2) + '\n');
  await fs.rename(summaryFile + '.tmp', summaryFile);
  console.log(JSON.stringify({ ...summary, results: summary.results?.length }));
}
