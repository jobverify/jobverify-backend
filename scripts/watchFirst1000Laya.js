import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { generateReport } from './reportFirst1000Laya.js'
import { atomicJson } from './localAtomicJson.js'

const read = async file => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

export async function watchAnalysis(directory, { intervalSeconds = 300 } = {}) {
  if (!Number.isFinite(intervalSeconds) || intervalSeconds < 10) throw new Error('Report interval must be at least ten seconds')
  const manifest = await read(path.join(directory, 'manifest.json'))
  if (manifest?.count !== 1000) throw new Error('Watcher requires the frozen 1000-company manifest')
  const lock = path.join(directory, 'analysis-watcher.lock')
  const token = randomUUID()
  try { await fs.writeFile(lock, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' }) }
  catch (error) {
    if (error.code !== 'EEXIST') throw error
    const owner = await read(lock)
    // A contender must never unlink another watcher's replacement lease.
    // An operator can remove a stale lease after independently verifying its recorded PID.
    throw new Error(`Analysis watcher ownership file already exists for PID ${owner?.pid ?? 'unknown'}`)
  }
  const startedAt = new Date().toISOString()
  const stateFile = path.join(directory, 'analysis-watcher.json')
  let stopped = false
  const stop = () => { stopped = true }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
  try {
    while (!stopped) {
      const state = { pid: process.pid, startedAt, updatedAt: new Date().toISOString(), intervalSeconds,
        classificationModelProcessesStarted: 0, phase: 'refreshing' }
      try {
        const report = await generateReport(directory)
        const packet = await read(path.join(directory, 'independent-review-packet.json'))
        const reviewed = report.independentReview.labelled + report.independentReview.ambiguous
        const expectedReviews = packet?.samplingScopeComplete && packet.catalogCompanies === manifest.count
          && packet.orderedSourcesHash === manifest.orderedSourcesHash ? packet.jobs.length : null
        const reviewComplete = expectedReviews !== null && reviewed === expectedReviews
          && report.independentReview.awaitingClassification === 0
          && report.strictIndependentReview.reviewed === expectedReviews
          && report.reviewSampleCoverage?.primaryComplete === true && report.reviewSampleCoverage?.strictComplete === true
        const coordinatorLock = await read(path.join(directory, 'run.lock'))
        const coordinatorExited = coordinatorLock === null
        Object.assign(state, { phase: report.complete && reviewComplete && coordinatorExited ? 'complete'
          : report.complete && reviewComplete ? 'waiting_coordinator_exit' : report.complete ? 'waiting_source_review' : 'running',
          pipelineComplete: report.complete, sourceReviewComplete: reviewComplete,
          companiesAttempted: report.companiesAttempted, completedJobs: report.completedRows,
          expectedReviews, reviewedJobs: reviewed, independentReview: report.independentReview,
          strictIndependentReview: report.strictIndependentReview })
      } catch (error) {
        state.phase = 'report_error'; state.error = error.message
        console.error(`${state.updatedAt}: ${error.message}`)
      }
      let statePublished = false
      try { await atomicJson(stateFile, state); statePublished = true }
      catch (error) { console.error(`${state.updatedAt}: watcher state publication failed: ${error.message}`) }
      if (state.phase === 'complete' && statePublished) return state
      // Short waits keep this process responsive to a stop signal.
      for (let remaining = intervalSeconds; remaining > 0 && !stopped; remaining -= 10) await delay(Math.min(remaining, 10) * 1000)
    }
    return { phase: 'stopped' }
  } finally {
    process.off('SIGINT', stop); process.off('SIGTERM', stop)
    const owner = await read(lock)
    if (owner?.token === token) await fs.rm(lock)
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const directory = path.resolve(process.argv[2] || '')
  watchAnalysis(directory).then(state => console.log(JSON.stringify(state))).catch(error => { console.error(error.stack); process.exitCode = 1 })
}
