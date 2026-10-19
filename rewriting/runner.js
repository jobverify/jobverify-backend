import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { factPlanMessages, factPlanSchema, validateFactPlan, assessRewriteInput, expandModelPlan } from './factPlan.js';
import { REWRITE_MODEL, REWRITE_SCHEMA, buildRewriteInput, rewriteMessages, validateRewrite } from '../src/services/jobDescriptionPolicy.js';

export const rewriteDeadline = ({ now = Date.now(), budgetSeconds = 1200, workflowStartedAt, workflowSeconds = 9000, cleanupSeconds = 120 } = {}) => {
  const budget = Number(budgetSeconds);
  if (!Number.isFinite(budget) || budget < 0) throw new Error('Rewrite budget must be a nonnegative number');
  if (![Number(workflowSeconds), Number(cleanupSeconds), Number(now)].every(Number.isFinite)) throw new Error('Invalid workflow deadline');
  if (workflowStartedAt && !Number.isFinite(Date.parse(workflowStartedAt))) throw new Error('Invalid workflow start timestamp');
  const started = Date.parse(workflowStartedAt);
  return Math.min(now + budget * 1000, Number.isFinite(started) ? started + Number(workflowSeconds) * 1000 - cleanupSeconds * 1000 : Infinity);
};


/** Read SSE incrementally; a closed socket without a finish frame is not a completion. */
const readCompletionStream = async response => {
  const decoder=new TextDecoder();let buffer='',content='',finishReason=null,done=false,usage,timings;
  const frame=line=>{
    if(!line.startsWith('data:'))return;
    const data=line.slice(5).trim();if(!data)return;
    if(data==='[DONE]'){done=true;return;}
    let value;try{value=JSON.parse(data);}catch{throw new Error('Malformed generator stream');}
    if(value.error)throw new Error('Local generator stream error');
    const choice=value.choices?.[0];
    if(typeof choice?.delta?.content==='string')content+=choice.delta.content;
    if(content.length>100000)throw new Error('Malformed oversized generator stream');
    if(choice?.finish_reason)finishReason=choice.finish_reason;
    usage=value.usage||usage;timings=value.timings||timings;
  };
  for await(const chunk of response.body){
    buffer+=decoder.decode(chunk,{stream:true});
    let end;while((end=buffer.indexOf('\n'))>=0){frame(buffer.slice(0,end).replace(/\r$/,''));buffer=buffer.slice(end+1);}
    if(buffer.length>100000)throw new Error('Malformed oversized generator frame');
  }
  buffer+=decoder.decode();if(buffer.trim())frame(buffer.replace(/\r$/,''));
  if(!done||!finishReason)throw new Error('Local generator stream incomplete');
  return {choices:[{message:{content},finish_reason:finishReason}],usage,timings};
};

export const createRewriteClient = ({ endpoint = 'http://127.0.0.1:8766', model = 'job-description-lfm', requestMs = REWRITE_MODEL.requestSeconds * 1000, planCacheDir } = {}) => {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Generation must run on unauthenticated http://127.0.0.1');
  const cache = new Map();
  return { generate: async (input, { signal, remainingMs = requestMs } = {}) => {
    const timeout = AbortSignal.timeout(Math.max(1, Math.floor(Math.min(requestMs, remainingMs))));
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    combined.throwIfAborted();
    const messages=factPlanMessages(input),schema=factPlanSchema(input);
    const requestHash=createHash('sha256').update(JSON.stringify([REWRITE_MODEL,messages,schema])).digest('hex');
    const cached=cache.get(requestHash);
    if(cached)return {...cached,value:expandModelPlan(cached.rawValue,input),cachedModelPlan:true,cacheSource:'memory'};
    const cacheFile=planCacheDir&&path.join(path.resolve(planCacheDir),requestHash+'.json');
    if(cacheFile){
      let entry;try{if((await fs.stat(cacheFile)).size<=16000)entry=JSON.parse(await fs.readFile(cacheFile,{encoding:'utf8',signal:combined}));}catch{}
      combined.throwIfAborted();
      if(entry?.version===1&&entry.requestHash===requestHash){const value=expandModelPlan(entry.rawValue,input);if(value&&validateFactPlan(value,input,'stop').ok){const completion={value,rawValue:entry.rawValue,finishReason:'stop'};cache.set(requestHash,completion);return {...completion,cachedModelPlan:true,cacheSource:'disk'};}}
    }
    const response = await fetch(url.origin + '/v1/chat/completions', { method: 'POST', signal: combined, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      model, messages, temperature: .2, top_p: .8, seed: 42,
      max_tokens: Math.min(REWRITE_MODEL.maxOutputTokens, 768), stream: true, stream_options: { include_usage: true },
      response_format: { type: 'json_schema', json_schema: { name: 'job_description', strict: true, schema } },
    }) });
    if (!response.ok) throw new Error('Local generator HTTP ' + response.status);
    const result = response.headers.get('content-type')?.includes('text/event-stream') ? await readCompletionStream(response) : await response.json();
    const choice = result.choices?.[0];
    if (!choice || typeof choice.message?.content !== 'string') throw new Error('Malformed generator response');
    let value;
    try { value = JSON.parse(choice.message.content); } catch { value = null; }
    const completion={value:expandModelPlan(value,input),rawValue:value,finishReason:choice.finish_reason,timings:result.timings,usage:result.usage};
    if(completion.finishReason==='stop'&&completion.value&&validateFactPlan(completion.value,input,'stop').ok){
      cache.set(requestHash,completion);
      if(cacheFile&&!combined.aborted){let temporary;try{await fs.mkdir(path.dirname(cacheFile),{recursive:true});temporary=cacheFile+'.'+randomUUID()+'.tmp';await fs.writeFile(temporary,JSON.stringify({version:1,requestHash,rawValue:completion.rawValue})+'\n');await fs.rename(temporary,cacheFile);}catch{if(temporary)await fs.rm(temporary,{force:true}).catch(()=>{});}}
    }
    return completion;
  } };
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
});

/** The caller supplies a Mongo update boundary; source/filter fields never enter these updates. */
export const rewriteCandidates = async (jobs, { client, update, deadline, signal, onResult = () => {} } = {}) => {
  const stats = { attempted: 0, published: 0, failed: 0, skipped: 0, staleSources: 0, concurrentChanges: 0, interrupted: false };
  for await (const job of jobs) {
    if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
    const input = buildRewriteInput(job);
    const filter = { _id: job._id, status: 'active', sourceContentHash: job.sourceContentHash,
      'descriptionRewrite.status': job.descriptionRewrite.status,
      'descriptionRewrite.attempts': job.descriptionRewrite.attempts ?? 0 };
    if (!input.eligible || input.inputHash !== job.sourceContentHash || job.descriptionRewrite.inputHash !== input.inputHash) { stats.staleSources++; continue; }
    const started = Date.now();
    const assessment = assessRewriteInput(input);
    if (assessment.ok) stats.attempted++;
    let response, result;
    try {
      if (!assessment.ok) result = assessment;
      else {
      response = await client.generate(input, { signal, remainingMs: deadline - started });
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
      result = response.value && Object.hasOwn(response.value, 'categories') ? validateFactPlan(response.value, input, response.finishReason) : validateRewrite(response.value, input, response.finishReason);
      }
    } catch (error) {
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
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
    await onResult({ id: String(job._id), inputHash: input.inputHash, ok: result.ok, reason: result.reason, durationMs, wordCount: result.wordCount, generated: assessment.ok, modelPlanCached: response?.cachedModelPlan || false, quality: result.quality, usage: response?.usage, timings: response?.timings });
  }
  return stats;
};
