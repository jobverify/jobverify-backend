// Run the real worker pool in an isolated process with in-memory provider and
// persistence boundaries. No configured database, network or filesystem writes.
import { registerHooks } from 'node:module'
import { mock } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const scenario = process.argv[2]
const state = {
  started: [],
  peerAborted: false,
  peerSettled: false,
  history: null,
  finished: null,
  error: null,
  checkpoint: null,
}
const quotaError = new Error('over your space quota. Writes are blocked on your cluster.')
const source = (name, sourceLifecycleTimeoutMs = 0) => ({
  name,
  sourceLifecycleTimeoutMs,
  run: async () => {
    state.started.push(name)
    return []
  },
})
globalThis.runnerLifecycleFixture = {
  scrapers: scenario === 'inactive'
    ? [source('disabled-one'), source('disabled-two')]
    : ['checkpoint-resume', 'checkpoint-failure-threshold'].includes(scenario)
      ? [source('alpha'), source('beta')]
    : scenario === 'cooperative-timeout'
      ? [source('broken', 5), source('queued')]
      : [source('broken', 5), source('peer'), source('queued')],
  status: () => ({ isActive: scenario !== 'inactive' }),
  save: async (_jobs, name, { signal }) => {
    if (name === 'broken') {
      if (scenario === 'quota') throw quotaError
      if (scenario === 'cooperative-timeout') {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      }
      return new Promise(() => {})
    }
    if (name === 'peer') {
      return new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          state.peerAborted = true
          if (scenario === 'uncooperative-peer') return
          setTimeout(() => {
            state.peerSettled = true
            reject(signal.reason)
          }, 1)
        }, { once: true })
      })
    }
    return { inserted: 0 }
  },
  history: (_startedAt, summary) => {
    state.history = structuredClone(summary)
    state.settledBeforeHistory = state.peerSettled
  },
  finished: (details) => { state.finished = details },
}

const stubs = new Map([
  [new URL('../../providers/index.js', import.meta.url).href,
    'export const buildScrapers = () => globalThis.runnerLifecycleFixture.scrapers'],
  [new URL('../../utils/saveToDB.js', import.meta.url).href, `
    export const saveToDB = (...args) => globalThis.runnerLifecycleFixture.save(...args)
    export const purgeExpiredJobsForQuotaRecovery = async () => ({ deletedCount: 0 })
    export const saveDryRunSnapshot = async () => { throw new Error('Unexpected dry-run write') }
  `],
  [new URL('../../utils/scraperPersistence.js', import.meta.url).href, `
    export const ensureScrapersSeeded = async () => {}
    export const markPipelineRunStarted = async () => {}
    export const readPreviousScraperRun = async () => null
    export const upsertScraperStatus = async () => {}
    export const writeScraperRun = async (...args) => globalThis.runnerLifecycleFixture.history(...args)
    export const markPipelineRunFinished = async (...args) => globalThis.runnerLifecycleFixture.finished(...args)
  `],
  [new URL('../../../src/models/ScraperStatus.js', import.meta.url).href, `
    export default { findOne: () => ({ lean: () => ({ exec: async () => globalThis.runnerLifecycleFixture.status() }) }) }
  `],
  [new URL('../../../src/services/jobDatasetSummaryService.js', import.meta.url).href,
    'export const refreshJobDatasetSummary = async () => {}'],
])

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'dotenv') {
      return { url: 'data:text/javascript,export default { config() {} }', shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (stubs.has(url)) {
      return { format: 'module', source: stubs.get(url), shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

// Child-only inputs avoid the developer's .env and source-selection settings.
process.env.MONGO_URI = 'mongodb://offline.invalid/never-connected'
process.env.SCRAPER_CONCURRENCY = scenario === 'cooperative-timeout' ? '1' : '2'
let checkpointDir = null
if (['checkpoint-resume', 'checkpoint-failure-threshold'].includes(scenario)) {
  checkpointDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobverify-runner-resume-'))
  process.env.SCRAPER_CHECKPOINT_FILE = path.join(checkpointDir, 'run-state.json')
  fs.writeFileSync(process.env.SCRAPER_CHECKPOINT_FILE, JSON.stringify({
    version: 1,
    runId: 'fixture-run',
    mode: 'live',
    parallel: true,
    status: 'running',
    catalogSources: ['alpha', 'beta'],
    totalSources: 2,
    completedCount: 1,
    remainingCount: 1,
    inProgress: {},
    completed: {
      alpha: {
        completedAt: '2026-09-12T06:00:00.000Z',
        result: scenario === 'checkpoint-failure-threshold'
          ? { success: false, failureKind: 'unexpected', error: 'fixture failure' }
          : { success: true, jobs: 1 },
      },
    },
  }))
}
for (const key of ['SCRAPER_ONLY', 'SCRAPER_START_AT', 'SCRAPER_START_AFTER', 'SCRAPER_SOURCE_LIFECYCLE_TIMEOUT_MS', 'SCRAPER_FAILURE_ABORT_THRESHOLD']) {
  delete process.env[key]
}
if (scenario === 'checkpoint-failure-threshold') {
  process.env.SCRAPER_FAILURE_ABORT_THRESHOLD = '1'
}
console.log = console.error = console.warn = () => {}
const { runAll } = await import('../../runner.js')
mock.timers.enable({ apis: ['setTimeout'] })
let completed = false
const run = runAll().catch((error) => {
  state.error = { name: error.name, message: error.message }
}).finally(() => { completed = true })

for (let step = 0; step < 20 && !completed; step += 1) {
  await setImmediate()
  mock.timers.tick(1_000)
}
await setImmediate()
if (!completed) {
  process.stdout.write(JSON.stringify({ ...state, error: { name: 'UnsettledPipeline' } }))
  process.exit(0)
}
await run
mock.timers.reset()
if (checkpointDir) {
  state.checkpoint = JSON.parse(fs.readFileSync(process.env.SCRAPER_CHECKPOINT_FILE, 'utf8'))
  fs.rmSync(checkpointDir, { recursive: true, force: true })
}
process.stdout.write(JSON.stringify(state))
