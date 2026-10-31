import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import connectDB from '../db/db.js'
import Job from '../src/models/Job.js'
import { CLASSIFICATION_FIELDS } from '../src/services/jobClassificationPolicy.js'
import { normalizePublicJobType } from '../src/utils/publicJobTypeLabel.js'
import { alreadyClassified, classificationShard, postScrapeInput, GLICLASS_CONFIG,
  resolvePostScrapeClassification, sourceSnapshotFilter } from '../src/services/postScrapeClassification.js'
import { startGliclassWorker } from './gliclassWorker.js'
import { createProgressLogger } from './lib/progressLogger.js'
import { trialNativeInputHash, trialNativeRuntimeHash } from './trialNativePredictionCache.js'
import { classificationSkipReason, createClassificationReport, recordClassificationInput, recordClassificationDecision,
  recordClassificationInference } from '../classification/reporting.js'

async function* assignedSavedJobs(model, shard, shardCount, summary, shouldStop) {
  const query = model.find({ status: 'active' }).sort({ _id: 1 }).lean()
  // Partition using small identities first. Four workers should not download
  // four copies of every description before discarding the other three shards.
  if (shardCount > 1) query.select({ _id: 1, fingerprint: 1 })
  const cursor = query.cursor({ batchSize: shardCount > 1 ? 1000 : 100 })
  let assignedIds = []
  async function* fetchAssigned() {
    const ids = assignedIds
    assignedIds = []
    for (const job of await model.find({ _id: { $in: ids }, status: 'active' }).sort({ _id: 1 }).lean()) {
      // A rescrape may change the fingerprint after the identity scan.
      if (classificationShard(job.fingerprint || job._id, shardCount) === shard) yield job
    }
  }
  try {
    for await (const row of cursor) {
      if (shouldStop()) { summary.budgetExhausted = true; return }
      summary.scanned++
      if (shardCount === 1) yield row
      else if (classificationShard(row.fingerprint || row._id, shardCount) === shard) {
        assignedIds.push(row._id)
        if (assignedIds.length === 100) yield* fetchAssigned()
      }
    }
    if (assignedIds.length) {
      if (shouldStop()) summary.budgetExhausted = true
      else yield* fetchAssigned()
    }
  } finally { await cursor.close() }
}

export async function classifySavedJobs({ model = Job, worker, now = () => new Date(),
  mode = 'shadow', shard = 0, shardCount = 1, budgetSeconds = 18000, signal,
  onProgress = () => {}, onResult = () => {} } = {}) {
  if (!['shadow', 'policy'].includes(mode)) throw new Error('Mode must be shadow or policy')
  if (!Number.isSafeInteger(shard) || shard < 0 || shard >= shardCount) throw new Error('Invalid shard')
  classificationShard('validate', shardCount)
  if (!Number.isFinite(budgetSeconds) || budgetSeconds <= 0) throw new Error('Invalid time budget')
  const started = Date.now(), owner = randomUUID(), nativeRuntime = trialNativeRuntimeHash()
  const summary = { ...createClassificationReport(worker.configuration),
    modelId: GLICLASS_CONFIG.model, modelRevision: GLICLASS_CONFIG.revision,
    mode, shard, shardCount, scanned: 0, assigned: 0, cached: 0, nativeCached: 0,
    completed: 0, skipped: 0, failed: 0, stale: 0, leased: 0, budgetExhausted: false }
  const shouldStop = () => signal?.aborted || Date.now()-started >= budgetSeconds*1000
  const cursor = assignedSavedJobs(model, shard, shardCount, summary, shouldStop)
  try {
    for await (const job of cursor) {
      if (shouldStop()) {
        summary.budgetExhausted = true
        break
      }
      summary.assigned++
      const jobStarted = Date.now()
      const clock = now(), input = postScrapeInput(job, { now: clock })
      recordClassificationInput(summary, input)
      const inputBytes = Buffer.byteLength(input.body, 'utf8')
      const emit = async (status, details = {}) => {
        await onResult({ id: String(job._id), company: String(job.company || '').slice(0, 200),
          title: input.title.slice(0, 200), source: String(job.source || '').slice(0, 200),
          inputHash: input.inputHash, inputBytes, descriptionOrigin: input.descriptionOrigin,
          shard, status, durationMs: Date.now() - jobStarted, ...details })
        await onProgress({ ...summary, elapsedSeconds: (Date.now() - started) / 1000 })
      }
      const decisionDetails = (result, prediction, publicJobType) => {
        const modelJobType = prediction?.modelLabel ?? result?.comparison?.modelJobType ?? null
        const finalJobType = result?.resolved?.jobType
        return {
          resolvedJobType: result?.resolved?.jobType ?? null, publicJobType: publicJobType ?? null,
          modelJobType, sourcePolicyJobType: result?.comparison?.logicJobType ?? null,
          modelMatchesFinalLabel: modelJobType && finalJobType ? modelJobType === finalJobType : null,
          decisionSource: result?.decisionSource ?? null, classificationStatus: result?.status ?? null,
          uncertain: result?.resolved ? result.status === 'uncertain' || result.resolved.jobType === 'Unspecified' : null,
          modelAgreement: result?.comparison?.agreement ?? null,
          uncalibratedModelScore: result?.decisions?.jobType?.probability ?? null,
          reason: result?.reason ?? null,
          sourceQualityIssues: result?.sourceQualityIssues ?? [], reviewReasons: result?.reviewReasons ?? [],
        }
      }
      if (alreadyClassified(job, input, mode)) {
        summary.cached++
        const previous = job.postClassification.result
        const publicJobType = mode === 'policy' ? job.jobType : null
        recordClassificationDecision(summary, { input, result: previous?.classification,
          prediction: previous?.prediction, publicJobType })
        await emit('cached', { ...decisionDetails(previous?.classification, previous?.prediction, publicJobType), modelRequest: false })
        continue
      }
      const snapshot = sourceSnapshotFilter(job)
      if (input.incomplete) {
        const reason = classificationSkipReason(input, GLICLASS_CONFIG.maxInputBytes)
        const saved = await model.updateOne(snapshot, { $set: { postClassification: {
          inputHash: input.inputHash, mode, status: 'skipped', reason, attemptedAt: clock,
        } } })
        if (saved.matchedCount === 0) {
          summary.stale++
          await emit('stale', { reason: 'source_changed', modelRequest: false })
        } else {
          summary.skipped++
          summary.skipReasons[reason]++
          await emit('skipped', { reason, maxInputBytes: GLICLASS_CONFIG.maxInputBytes, modelRequest: false })
        }
        continue
      }
      const claimed = await model.updateOne({ ...snapshot, $or: [
        { 'postClassification.status': { $ne: 'processing' } },
        { 'postClassification.leaseUntil': { $lte: clock } },
        { 'postClassification.leaseUntil': { $exists: false } },
      ] }, { $set: { postClassification: { inputHash: input.inputHash, mode, status: 'processing',
        owner, attemptedAt: clock, leaseUntil: new Date(clock.getTime()+10*60*1000),
        attempts: job.postClassification?.inputHash === input.inputHash ? (job.postClassification.attempts || 0)+1 : 1,
      } } })
      if (!claimed.modifiedCount) { summary.leased++; await emit('leased', { reason: 'live_lease_or_source_changed', modelRequest: false }); continue }
      let outcome, details = {}, inferred = false
      try {
        const nativeInputHash = trialNativeInputHash(input, nativeRuntime)
        const priorNative = job.postClassification?.status === 'completed'
          && job.postClassification.result?.nativeInputHash === nativeInputHash
          ? job.postClassification.result.prediction : null
        let prediction = priorNative
        if (!prediction) {
          inferred = true
          summary.modelRequests++
          prediction = await worker.classify(input)
          recordClassificationInference(summary, prediction)
        }
        const result = resolvePostScrapeClassification(job, prediction, { now: clock, mode })
        if (priorNative) summary.nativeCached++
        const fields = mode === 'policy' ? { classification: result,
          ...Object.fromEntries(CLASSIFICATION_FIELDS.map(field => [field, result.resolved[field] ?? null])),
          jobType: normalizePublicJobType(result.resolved.jobType) } : {}
        const updated = await model.updateOne({ ...snapshot, 'postClassification.owner': owner,
          'postClassification.inputHash': input.inputHash }, { $set: { ...fields,
          'postClassification.status': 'completed', 'postClassification.completedAt': now(),
          'postClassification.result': { classification: result, prediction, nativeInputHash },
        }, $unset: { 'postClassification.owner': '', 'postClassification.leaseUntil': '' } })
        if (updated.modifiedCount) {
          summary.completed++
          outcome = 'completed'
          const publicJobType = mode === 'policy' ? fields.jobType : null
          recordClassificationDecision(summary, { input, result, prediction, publicJobType })
          details = { ...decisionDetails(result, prediction, publicJobType), nativeCached: !!priorNative,
            windows: prediction.windows, descriptionTokens: prediction.descriptionTokens,
            ...(inferred ? { inferenceSeconds: prediction.seconds, cpuSeconds: prediction.cpuSeconds,
              peakRssBytes: prediction.peakRssBytes } : {}) }
        }
        else {
          summary.stale++
          outcome = 'stale'
          details = { reason: 'source_changed' }
          await model.updateOne({ _id: job._id, 'postClassification.owner': owner }, {
            $set: { 'postClassification.status': 'failed', 'postClassification.reason': 'source_changed' },
            $unset: { 'postClassification.owner': '', 'postClassification.leaseUntil': '' },
          })
        }
      } catch (error) {
        summary.failed++
        outcome = 'failed'
        details = { reason: 'classification_error', errorType: error.name }
        await model.updateOne({ _id: job._id, 'postClassification.owner': owner }, {
          $set: { 'postClassification.status': 'failed', 'postClassification.reason': String(error.message).slice(0, 300) },
          $unset: { 'postClassification.owner': '', 'postClassification.leaseUntil': '' },
        })
      }
      await emit(outcome, { ...details, modelRequest: inferred })
    }
  } finally { await cursor.return() }
  return { ...summary, elapsedSeconds: (Date.now()-started)/1000 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config({ quiet: true })
  const controller = new AbortController()
  process.once('SIGTERM', () => controller.abort())
  process.once('SIGINT', () => controller.abort())
  let worker
  const shard = Number(process.env.CLASSIFICATION_SHARD || 0)
  let latestProgress = {}
  const progress = createProgressLogger('classification', () => ({ shard, ...latestProgress }))
  const output = process.env.CLASSIFICATION_SUMMARY_FILE || `.cache/scraper-actions/classification-${shard}.json`
  const diagnostics = process.env.CLASSIFICATION_DIAGNOSTICS_FILE || output.replace(/\.json$/, '') + '.ndjson'
  const persist = summary => { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output,
    JSON.stringify({ ...summary, diagnosticsFile: path.basename(diagnostics) }, null, 2)) }
  try {
    progress.phase('configuration')
    if (path.resolve(diagnostics) === path.resolve(output)) throw new Error('Classification diagnostics and summary must use different files')
    fs.mkdirSync(path.dirname(diagnostics), { recursive: true })
    fs.writeFileSync(diagnostics, '')
    progress.phase('connect')
    await connectDB()
    progress.phase('start_worker')
    worker = await startGliclassWorker()
    progress.phase('process_queue')
    const summary = await classifySavedJobs({ worker, shard, shardCount: Number(process.env.CLASSIFICATION_SHARD_COUNT || 1),
      mode: process.env.POST_SCRAPE_CLASSIFICATION_MODE || 'shadow',
      budgetSeconds: Number(process.env.CLASSIFICATION_BUDGET_SECONDS || 18000), signal: controller.signal,
      onProgress: value => {
        const { scanned, assigned, completed, cached, nativeCached, skipped, failed, stale, leased, modelRequests } = value
        latestProgress = { scanned, assigned, completed, cached, nativeCached, skipped, failed, stale, leased, modelRequests }
        persist(value)
      }, onResult: row => fs.appendFileSync(diagnostics, JSON.stringify(row) + '\n') })
    persist(summary)
    console.log(JSON.stringify(summary))
    if (summary.failed || summary.stale || summary.budgetExhausted) process.exitCode = 1
  } finally {
    progress.stop()
    await worker?.stop()
    await mongoose.disconnect()
  }
}
