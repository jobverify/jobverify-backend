import { REWRITE_MODEL, REWRITE_SCHEMA, buildRewriteInput, rewriteMessages, validateRewrite } from '../src/services/jobDescriptionPolicy.js';

export const rewriteDeadline = ({ now = Date.now(), budgetSeconds = 1200, workflowStartedAt, workflowSeconds = 9000, cleanupSeconds = 120 } = {}) => {
  const budget = Number(budgetSeconds);
  if (!Number.isFinite(budget) || budget < 0) throw new Error('Rewrite budget must be a nonnegative number');
  if (![Number(workflowSeconds), Number(cleanupSeconds), Number(now)].every(Number.isFinite)) throw new Error('Invalid workflow deadline');
  if (workflowStartedAt && !Number.isFinite(Date.parse(workflowStartedAt))) throw new Error('Invalid workflow start timestamp');
  const started = Date.parse(workflowStartedAt);
  return Math.min(now + budget * 1000, Number.isFinite(started) ? started + Number(workflowSeconds) * 1000 - cleanupSeconds * 1000 : Infinity);
};

export const createRewriteClient = ({ endpoint = 'http://127.0.0.1:8766', model = 'job-description-qwen', requestMs = REWRITE_MODEL.requestSeconds * 1000 } = {}) => {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Generation must run on unauthenticated http://127.0.0.1');
  return { generate: async (input, { signal, remainingMs = requestMs } = {}) => {
    const timeout = AbortSignal.timeout(Math.max(1, Math.floor(Math.min(requestMs, remainingMs))));
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await fetch(url.origin + '/v1/chat/completions', { method: 'POST', signal: combined, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      model, messages: rewriteMessages(input), temperature: .2, top_p: .8, seed: 42,
      max_tokens: REWRITE_MODEL.maxOutputTokens, stream: false,
      response_format: { type: 'json_schema', json_schema: { name: 'job_description', strict: true, schema: REWRITE_SCHEMA } },
    }) });
    if (!response.ok) throw new Error('Local generator HTTP ' + response.status);
    const result = await response.json();
    const choice = result.choices?.[0];
    if (!choice || typeof choice.message?.content !== 'string') throw new Error('Malformed generator response');
    let value;
    try { value = JSON.parse(choice.message.content); } catch { value = null; }
    return { value, finishReason: choice.finish_reason, timings: result.timings, usage: result.usage };
  } };
};

export const rewriteQueueQuery = (now = new Date()) => ({ status: 'active', sourceContentHash: { $type: 'string' },
  'descriptionRewrite.attempts': { $lt: 3 }, $or: [
    { 'descriptionRewrite.status': 'pending' },
    { 'descriptionRewrite.status': 'failed', 'descriptionRewrite.nextAttemptAt': { $lte: now } },
  ],
});

/** The caller supplies a Mongo update boundary; source/filter fields never enter these updates. */
export const rewriteCandidates = async (jobs, { client, update, deadline, signal, onResult = () => {} } = {}) => {
  const stats = { attempted: 0, published: 0, failed: 0, skipped: 0, concurrentChanges: 0, interrupted: false };
  for await (const job of jobs) {
    if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
    const input = buildRewriteInput(job);
    const filter = { _id: job._id, status: 'active', sourceContentHash: job.sourceContentHash,
      'descriptionRewrite.status': job.descriptionRewrite.status,
      'descriptionRewrite.attempts': job.descriptionRewrite.attempts ?? 0 };
    if (!input.eligible || input.inputHash !== job.sourceContentHash || job.descriptionRewrite.inputHash !== input.inputHash) { stats.skipped++; continue; }
    const started = Date.now();
    stats.attempted++;
    let response, result;
    try {
      response = await client.generate(input, { signal, remainingMs: deadline - started });
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
      result = validateRewrite(response.value, input, response.finishReason);
    } catch (error) {
      if (signal?.aborted || Date.now() >= deadline) { stats.interrupted = true; break; }
      result = { ok: false, reason: error.name === 'TimeoutError' ? 'timeout' : 'generation_error' };
    }
    const now = new Date(), durationMs = Date.now() - started;
    const metadata = { 'descriptionRewrite.attemptedAt': now, 'descriptionRewrite.durationMs': durationMs,
      'descriptionRewrite.modelRevision': REWRITE_MODEL.revision, 'descriptionRewrite.runtimeTag': REWRITE_MODEL.runtimeTag,
      'descriptionRewrite.policyVersion': REWRITE_MODEL.policyVersion,
      'descriptionRewrite.status': result.ok ? 'published' : 'failed', 'descriptionRewrite.reason': result.ok ? null : result.reason };
    const values = { $set: { ...metadata,
      ...(result.ok ? { description: result.description, descriptionFormat: 'markdown', 'descriptionRewrite.publishedAt': now,
        'descriptionRewrite.wordCount': result.wordCount } : { 'descriptionRewrite.nextAttemptAt': new Date(now.getTime() + 3600000) }),
    }, $inc: { 'descriptionRewrite.attempts': 1 } };
    const saved = await update(filter, values);
    if (saved.matchedCount === 0) stats.concurrentChanges++;
    else if (result.ok) stats.published++;
    else stats.failed++;
    await onResult({ id: String(job._id), inputHash: input.inputHash, ok: result.ok, reason: result.reason, durationMs, wordCount: result.wordCount, usage: response?.usage, timings: response?.timings });
  }
  return stats;
};
