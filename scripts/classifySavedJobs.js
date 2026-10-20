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
import { alreadyClassified, classificationShard, postScrapeInput,
  resolvePostScrapeClassification, sourceSnapshotFilter } from '../src/services/postScrapeClassification.js'
import { startGliclassWorker } from './gliclassWorker.js'
import { trialNativeInputHash, trialNativeRuntimeHash } from './trialNativePredictionCache.js'

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
  onProgress = () => {} } = {}) {
  if (!['shadow', 'policy'].includes(mode)) throw new Error('Mode must be shadow or policy')
  if (!Number.isSafeInteger(shard) || shard < 0 || shard >= shardCount) throw new Error('Invalid shard')
  classificationShard('validate', shardCount)
  if (!Number.isFinite(budgetSeconds) || budgetSeconds <= 0) throw new Error('Invalid time budget')
  const started = Date.now(), owner = randomUUID(), nativeRuntime = trialNativeRuntimeHash()
  const summary = { mode, shard, shardCount, scanned: 0, assigned: 0, cached: 0, nativeCached: 0,
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
      const clock = now(), input = postScrapeInput(job, { now: clock })
      if (alreadyClassified(job, input, mode)) { summary.cached++; continue }
      const snapshot = sourceSnapshotFilter(job)
      if (input.incomplete) {
        await model.updateOne(snapshot, { $set: { postClassification: {
          inputHash: input.inputHash, mode, status: 'skipped', reason: 'missing_or_oversized_description', attemptedAt: clock,
        } } })
        summary.skipped++
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
      if (!claimed.modifiedCount) { summary.leased++; continue }
      try {
        const nativeInputHash = trialNativeInputHash(input, nativeRuntime)
        const priorNative = job.postClassification?.status === 'completed'
          && job.postClassification.result?.nativeInputHash === nativeInputHash
          ? job.postClassification.result.prediction : null
        const prediction = priorNative || await worker.classify(input)
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
        if (updated.modifiedCount) summary.completed++
        else {
          summary.stale++
          await model.updateOne({ _id: job._id, 'postClassification.owner': owner }, {
            $set: { 'postClassification.status': 'failed', 'postClassification.reason': 'source_changed' },
            $unset: { 'postClassification.owner': '', 'postClassification.leaseUntil': '' },
          })
        }
      } catch (error) {
        summary.failed++
        await model.updateOne({ _id: job._id, 'postClassification.owner': owner }, {
          $set: { 'postClassification.status': 'failed', 'postClassification.reason': String(error.message).slice(0, 300) },
          $unset: { 'postClassification.owner': '', 'postClassification.leaseUntil': '' },
        })
      }
      onProgress({ ...summary, elapsedSeconds: (Date.now()-started)/1000 })
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
  const output = process.env.CLASSIFICATION_SUMMARY_FILE || `.cache/scraper-actions/classification-${shard}.json`
  const persist = summary => { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(summary, null, 2)) }
  try {
    await connectDB()
    worker = await startGliclassWorker()
    const summary = await classifySavedJobs({ worker, shard, shardCount: Number(process.env.CLASSIFICATION_SHARD_COUNT || 1),
      mode: process.env.POST_SCRAPE_CLASSIFICATION_MODE || 'shadow',
      budgetSeconds: Number(process.env.CLASSIFICATION_BUDGET_SECONDS || 18000), signal: controller.signal,
      onProgress: persist })
    persist(summary)
    console.log(JSON.stringify(summary))
    if (summary.failed || summary.stale || summary.budgetExhausted) process.exitCode = 1
  } finally { await worker?.stop(); await mongoose.disconnect() }
}
