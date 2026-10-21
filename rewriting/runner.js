import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { factPlanMessages, factPlanSchema, validateFactPlan, assessRewriteInput, expandModelPlan } from './factPlan.js';
import { REWRITE_MODEL, buildRewriteInput, validateRewrite } from '../src/services/jobDescriptionPolicy.js';
import { reconcileRewriteCandidate, rewriteSnapshotFilter } from './queue.js';
import { RewriteWorkerError } from './worker.js';

export const rewriteDeadline = ({ now = Date.now(), budgetSeconds = 1200, workflowStartedAt, workflowSeconds = 9000, cleanupSeconds = 120 } = {}) => {
  const budget = Number(budgetSeconds);
  if (!Number.isFinite(budget) || budget < 0) throw new Error('Rewrite budget must be a nonnegative number');
  if (![Number(workflowSeconds), Number(cleanupSeconds), Number(now)].every(Number.isFinite)) throw new Error('Invalid workflow deadline');
  if (workflowStartedAt && !Number.isFinite(Date.parse(workflowStartedAt))) throw new Error('Invalid workflow start timestamp');
  const started = Date.parse(workflowStartedAt);
  return Math.min(now + budget * 1000, Number.isFinite(started) ? started + Number(workflowSeconds) * 1000 - cleanupSeconds * 1000 : Infinity);
};

export class RewriteGenerationError extends Error {
  constructor(message, options) { super(message, options); this.name = 'RewriteGenerationError'; }
}

/** Read SSE incrementally; a closed socket without a finish frame is not a completion. */
const readCompletionStream = async response => {
  if (!response.body || typeof response.body[Symbol.asyncIterator] !== 'function') throw new RewriteGenerationError('Local generator stream missing');
  const decoder=new TextDecoder();let buffer='',content='',finishReason=null,done=false,usage,timings;
  const frame=line=>{
    if(!line.startsWith('data:'))return;
    const data=line.slice(5).trim();if(!data)return;
    if(data==='[DONE]'){done=true;return;}
    let value;try{value=JSON.parse(data);}catch{throw new RewriteGenerationError('Malformed generator stream');}
    if(!value||typeof value!=='object'||Array.isArray(value))throw new RewriteGenerationError('Malformed generator stream');
    if(value.error)throw new RewriteGenerationError('Local generator stream error');
    const choice=value.choices?.[0];
    if(typeof choice?.delta?.content==='string')content+=choice.delta.content;
    if(content.length>100000)throw new RewriteGenerationError('Malformed oversized generator stream');
    if(choice?.finish_reason)finishReason=choice.finish_reason;
    usage=value.usage||usage;timings=value.timings||timings;
  };
  for await(const chunk of response.body){
    buffer+=decoder.decode(chunk,{stream:true});
    let end;while((end=buffer.indexOf('\n'))>=0){frame(buffer.slice(0,end).replace(/\r$/,''));buffer=buffer.slice(end+1);}
    if(buffer.length>100000)throw new RewriteGenerationError('Malformed oversized generator frame');
  }
  buffer+=decoder.decode();if(buffer.trim())frame(buffer.replace(/\r$/,''));
  if(!done||!finishReason)throw new RewriteGenerationError('Local generator stream incomplete');
  return {choices:[{message:{content},finish_reason:finishReason}],usage,timings};
};

export const createRewriteClient = ({ endpoint = 'http://127.0.0.1:8766', model = 'job-description-lfm', requestMs = REWRITE_MODEL.requestSeconds * 1000, planCacheDir, assertAlive = () => {} } = {}) => {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Generation must run on unauthenticated http://127.0.0.1');
  const cache = new Map();
  return { generate: async (input, { signal, remainingMs = requestMs } = {}) => {
    const timeout = AbortSignal.timeout(Math.max(1, Math.floor(Math.min(requestMs, remainingMs))));
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    combined.throwIfAborted();
    assertAlive();
    const messages=factPlanMessages(input),schema=factPlanSchema(input);
    const requestHash=createHash('sha256').update(JSON.stringify([REWRITE_MODEL,messages,schema])).digest('hex');
    const cached=cache.get(requestHash);
    if(cached)return {...cached,value:expandModelPlan(cached.rawValue,input),cachedModelPlan:true,cacheSource:'memory',generationRequests:0};
    const cacheFile=planCacheDir&&path.join(path.resolve(planCacheDir),requestHash+'.json');
    if(cacheFile){
      let entry;try{if((await fs.stat(cacheFile)).size<=16000)entry=JSON.parse(await fs.readFile(cacheFile,{encoding:'utf8',signal:combined}));}catch{}
      combined.throwIfAborted();
      if(entry?.version===1&&entry.requestHash===requestHash){const value=expandModelPlan(entry.rawValue,input);if(value&&validateFactPlan(value,input,'stop').ok){const completion={value,rawValue:entry.rawValue,finishReason:'stop'};cache.set(requestHash,completion);return {...completion,cachedModelPlan:true,cacheSource:'disk',generationRequests:0};}}
    }
    let result, generationRequests = 0, outputTokens = REWRITE_MODEL.maxOutputTokens;
    try {
      while (true) {
        combined.throwIfAborted();
        assertAlive();
        generationRequests++;
        const response = await fetch(url.origin + '/v1/chat/completions', { method: 'POST', signal: combined, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          model, messages, temperature: .2, top_p: .8, seed: 41 + generationRequests,
          max_tokens: outputTokens, stream: true, stream_options: { include_usage: true },
          response_format: { type: 'json_schema', json_schema: { name: 'job_description', strict: true, schema } },
        }) });
        if (!response.ok) throw new RewriteGenerationError('Local generator HTTP ' + response.status);
        if (response.headers.get('content-type')?.includes('text/event-stream')) result = await readCompletionStream(response);
        else {
          try { result = await response.json(); }
          catch (error) { if (error instanceof SyntaxError) throw new RewriteGenerationError('Malformed generator response'); throw error; }
        }
        assertAlive();
        if (result?.choices?.[0]?.finish_reason !== 'length' || generationRequests >= 2) break;
        // Retry only token truncation, within the original timeout and per-slot context.
        let retryTokens = Math.min(REWRITE_MODEL.maxOutputTokens * 2, Math.floor(REWRITE_MODEL.contextTokens / 4));
        if (Number.isInteger(result.usage?.prompt_tokens) && result.usage.prompt_tokens >= 0) {
          retryTokens = Math.min(retryTokens, REWRITE_MODEL.contextTokens - result.usage.prompt_tokens - 32);
        }
        if (retryTokens <= outputTokens) break;
        outputTokens = retryTokens;
      }
    } catch (error) {
      error.generationRequests = generationRequests;
      assertAlive();
      if (error.cause?.code === 'ECONNREFUSED') throw new RewriteWorkerError('connection_refused');
      if (['ECONNRESET','ETIMEDOUT','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','Z_DATA_ERROR','Z_BUF_ERROR','Z_NEED_DICT'].includes(error.cause?.code)) {
        throw Object.assign(new RewriteGenerationError('Local generator request failed'), { generationRequests });
      }
      throw error;
    }
    assertAlive();
    const choice = result?.choices?.[0];
    if (!choice || typeof choice.message?.content !== 'string') throw Object.assign(new RewriteGenerationError('Malformed generator response'), { generationRequests });
    let value;
    try { value = JSON.parse(choice.message.content); } catch { value = null; }
    const completion={value:expandModelPlan(value,input),rawValue:value,finishReason:choice.finish_reason,timings:result.timings,usage:result.usage,generationRequests};
    if(completion.finishReason==='stop'&&completion.value&&validateFactPlan(completion.value,input,'stop').ok){
      cache.set(requestHash,completion);
      if(cacheFile&&!combined.aborted){let temporary;try{await fs.mkdir(path.dirname(cacheFile),{recursive:true});temporary=cacheFile+'.'+randomUUID()+'.tmp';await fs.writeFile(temporary,JSON.stringify({version:1,requestHash,rawValue:completion.rawValue})+'\n');await fs.rename(temporary,cacheFile);}catch{if(temporary)await fs.rm(temporary,{force:true}).catch(()=>{});}}
    }
    return completion;
  } };
};

/** Exercise fresh inference before any production queue entry can consume an attempt. */
export const probeRewriteClient = async (client, { concurrency = 1, deadline = Date.now() + 180000, signal } = {}) => {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Invalid probe concurrency');
  const started = Date.now();
  const probes = await Promise.allSettled(Array.from({ length: concurrency }, async (_, slot) => {
    signal?.throwIfAborted();
    const input = buildRewriteInput({ title: 'Software Engineer', company: 'Worker health check',
      sourceDescription: `Role overview: Build Python services for customer group ${slot + 1}. Responsibilities: Design reliable APIs and maintain Python services. Required qualifications: At least 2 years of software development experience is required. Preferred qualifications: AWS experience is nice to have.` });
    const response = await client.generate(input, { signal, remainingMs: Math.max(1, deadline - Date.now()) });
    signal?.throwIfAborted();
    if (response.cachedModelPlan) throw new RewriteWorkerError('generation_probe');
    if (!validateFactPlan(response.value, input, response.finishReason).ok) throw new RewriteGenerationError('Model readiness output was rejected');
  }));
  signal?.throwIfAborted();
  const rejections = probes.filter(result => result.status === 'rejected');
  const failure = rejections.find(result => !(result.reason instanceof RewriteGenerationError) && result.reason?.name !== 'TimeoutError');
  if (failure) {
    signal?.throwIfAborted();
    if (failure.reason.name === 'RewriteWorkerError') throw failure.reason;
    throw new RewriteWorkerError('generation_probe');
  }
  return { requests: concurrency, durationMs: Date.now() - started, ...(rejections.length ? { warnings: rejections.length } : {}) };
};

export const rewriteQueueQuery = (now = new Date()) => ({ status: 'active', sourceContentHash: { $type: 'string' },
  'descriptionRewrite.attempts': { $lt: 3 }, $or: [
    { 'descriptionRewrite.status': 'pending' },
    { 'descriptionRewrite.status': 'failed', 'descriptionRewrite.nextAttemptAt': { $lte: now } },
  ],
});

// The built-in _id index streams a stable order without sorting full descriptions in memory.
// Queue timestamps are not indexed, and small Atlas clusters cannot spill that sort to disk.
export const rewriteQueueScan = (Job, query = rewriteQueueQuery()) => Job.find(query)
  .sort({ _id: 1 }).hint({ _id: 1 }).lean();

export const rewriteFailureDetails = (error, phase) => ({
  errorType: error.name, errorPhase: phase,
  ...(Number.isInteger(error.code) ? { errorCode: error.code } : {}),
  ...(typeof error.codeName === 'string' && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(error.codeName)
    ? { errorCodeName: error.codeName } : {}),
  ...(Number.isInteger(error.workerExitCode) ? { workerExitCode: error.workerExitCode } : {}),
  ...(typeof error.workerSignal === 'string' && /^SIG[A-Z0-9]{1,20}$/.test(error.workerSignal) ? { workerSignal: error.workerSignal } : {}),
  ...(['process_exit', 'spawn_error', 'connection_refused', 'generation_probe'].includes(error.workerFailure) ? { workerFailure: error.workerFailure } : {}),
});

export const rewriteProgress = summary => {
  const jobWarnings = (summary.failed || 0) + (summary.staleSources || 0) + (summary.concurrentChanges || 0);
  return { warnings: jobWarnings + (summary.workerProbe?.warnings || 0),
    pendingEstimate: Math.max(0, (summary.queued || 0) - (summary.published || 0) - (summary.skipped || 0) - jobWarnings) };
};

/** The caller supplies a Mongo update boundary; source/filter fields never enter these updates. */
export const rewriteCandidates = async (jobs, { client, update, deadline, signal, concurrency = 1, onResult = () => {} } = {}) => {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Rewrite concurrency must be between one and four');
  const stats = { attempted: 0, published: 0, failed: 0, skipped: 0, queueRepairs: 0, staleSources: 0, concurrentChanges: 0, interrupted: false, peakConcurrency: 0 };
  const processJob = async job => {
    if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; return; }
    const reconciled = await reconcileRewriteCandidate(job, { update });
    if (reconciled.kind === 'stale') { stats.staleSources++; return; }
    if (reconciled.kind === 'conflict') { stats.concurrentChanges++; return; }
    if (reconciled.repaired) stats.queueRepairs++;
    if (reconciled.kind === 'skipped') {
      stats.skipped++;
      await onResult({ id: String(job._id), inputHash: reconciled.input.inputHash,
        ok: false, reason: reconciled.reason, durationMs: 0, generated: false });
      return;
    }
    job = reconciled.job;
    const { input } = reconciled;
    const filter = rewriteSnapshotFilter(job);
    if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; return; }
    const started = Date.now();
    const assessment = assessRewriteInput(input);
    if (assessment.ok) stats.attempted++;
    let response, result;
    try {
      if (!assessment.ok) result = assessment;
      else {
      response = await client.generate(input, { signal, remainingMs: deadline - started });
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; return; }
      result = response.value && Object.hasOwn(response.value, 'categories') ? validateFactPlan(response.value, input, response.finishReason) : validateRewrite(response.value, input, response.finishReason);
      }
    } catch (error) {
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; return; }
      if (!(error instanceof RewriteGenerationError) && error.name !== 'TimeoutError') throw error;
      if (Number.isInteger(error.generationRequests)) response = { generationRequests: error.generationRequests };
      result = { ok: false, reason: error.name === 'TimeoutError' ? 'timeout' : 'generation_error' };
    }
    const now = new Date(), durationMs = Date.now() - started;
    const metadata = { 'descriptionRewrite.attemptedAt': now, 'descriptionRewrite.durationMs': durationMs,
      'descriptionRewrite.modelRevision': REWRITE_MODEL.revision, 'descriptionRewrite.runtimeTag': REWRITE_MODEL.runtimeTag,
      'descriptionRewrite.policyVersion': REWRITE_MODEL.policyVersion,
      'descriptionRewrite.status': result.ok ? 'published' : !assessment.ok || ['not_improved','already_structured','dense_source','uncertain_section_assignment'].includes(result.reason) ? 'skipped' : 'failed', 'descriptionRewrite.reason': result.ok ? null : result.reason };
    const values = { $set: { ...metadata,
      ...(result.ok ? { description: result.description, descriptionFormat: 'markdown', 'descriptionRewrite.publishedAt': now,
        'descriptionRewrite.wordCount': result.wordCount, 'descriptionRewrite.quality': result.quality || null } : { 'descriptionRewrite.nextAttemptAt': new Date(now.getTime() + 3600000) }),
    }, $inc: { 'descriptionRewrite.attempts': 1 } };
    const saved = await update(filter, values);
    if (saved.matchedCount === 0) stats.concurrentChanges++;
    else if (result.ok) stats.published++;
    else if (!assessment.ok || ['not_improved','already_structured','dense_source','uncertain_section_assignment'].includes(result.reason)) stats.skipped++;
    else stats.failed++;
    await onResult({ id: String(job._id), inputHash: input.inputHash, ok: result.ok, reason: result.reason, durationMs, wordCount: result.wordCount, generated: assessment.ok, modelPlanCached: response?.cachedModelPlan || false,
      generationRequests: response?.generationRequests ?? (assessment.ok && !response?.cachedModelPlan ? 1 : 0), quality: result.quality, usage: response?.usage, timings: response?.timings });
  };
  const pending = new Set();
  let failure;
  try {
    // One producer owns the cursor; only generation and guarded updates overlap.
    for await (const job of jobs) {
      if (failure) break;
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
      const task = processJob(job).catch(error => { failure ??= error; }).finally(() => pending.delete(task));
      pending.add(task);
      stats.peakConcurrency = Math.max(stats.peakConcurrency, pending.size);
      if (pending.size >= concurrency) await Promise.race(pending);
    }
  } catch (error) { failure ??= error; }
  // Always finish scheduled work before callers close the cursor, model, or database.
  await Promise.all(pending);
  if (failure) { failure.rewriteStats = { ...stats }; throw failure; }
  return stats;
};
