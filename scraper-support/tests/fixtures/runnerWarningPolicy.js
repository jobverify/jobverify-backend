// Exercise the actual runner CLI with isolated source and persistence boundaries.
// All database and provider calls are replaced; only test artifacts are written.
import { registerHooks } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [scenario, directory] = process.argv.slice(2)
const state = { started: [], saved: [], history: null, finished: null }
globalThis.runnerWarningFixture = {
  check: boundary => {
    if (scenario === boundary) throw new Error(`shared ${boundary}`)
  },
  build: () => {
    if (scenario === 'runner-code-error') throw new ReferenceError('shared provider catalog code failed')
    return ['broken', 'healthy'].map(name => ({ name, sourceLifecycleTimeoutMs: 0,
      dryRunFile: scenario === 'artifact-error' ? directory : undefined, run: async () => {
      state.started.push(name)
      if (scenario === 'all-fail' || (name === 'broken' && ['source-failure', 'fatal-source'].includes(scenario))) {
        throw Object.assign(new Error('source inventory contract failed'), {
          abortRetries: true, ...(scenario === 'fatal-source' ? { abortPipeline: true } : {}),
        })
      }
      if (name === 'broken' && scenario === 'invalid-inventory') return { jobs: [] }
      if (name === 'broken' && scenario === 'null-row') return [null]
      if (name === 'broken' && scenario === 'scalar-row') return ['not a job record']
      if (name === 'broken' && scenario === 'array-row') return [[]]
      return []
    } }))
  },
  save: async (_jobs, name) => {
    if (scenario === 'persistence-error') throw new TypeError('shared persistence code failed')
    if (scenario === 'quota-error') throw new Error('over your space quota. Writes are blocked on your cluster.')
    if (name === 'broken' && scenario === 'pending') {
      throw Object.assign(new Error('source persistence unfinished'), { classificationPending: true })
    }
    state.saved.push(name)
    return { inserted: 1 }
  },
  history: (_startedAt, summary) => { state.history = summary },
  finished: details => {
    state.finished = details
    globalThis.runnerWarningFixture.check('finish-error')
  },
}
const stubs = new Map([
  [new URL('../../providers/index.js', import.meta.url).href,
    'export const buildScrapers = () => globalThis.runnerWarningFixture.build()'],
  [new URL('../../utils/saveToDB.js', import.meta.url).href, `
    export const saveToDB = (...args) => globalThis.runnerWarningFixture.save(...args)
    export const purgeExpiredJobsForQuotaRecovery = async () => ({ deletedCount: 0 })
    export const saveDryRunSnapshot = async () => { throw new Error('Unexpected dry-run write') }
  `],
  [new URL('../../utils/scraperPersistence.js', import.meta.url).href, `
    export const ensureScrapersSeeded = async () => globalThis.runnerWarningFixture.check('seed-error')
    export const markPipelineRunStarted = async () => globalThis.runnerWarningFixture.check('pipeline-start-error')
    export const readPreviousScraperRun = async () => null
    export const upsertScraperStatus = async () => globalThis.runnerWarningFixture.check('status-write-error')
    export const writeScraperRun = (...args) => globalThis.runnerWarningFixture.history(...args)
    export const markPipelineRunFinished = (...args) => globalThis.runnerWarningFixture.finished(...args)
  `],
  [new URL('../../../src/models/ScraperStatus.js', import.meta.url).href,
    `export default { findOne: () => ({ lean: () => ({ exec: async () => {
      globalThis.runnerWarningFixture.check('active-status-error')
      return { isActive: true }
    } }) }) }`],
  [new URL('../../../src/services/jobDatasetSummaryService.js', import.meta.url).href,
    'export const refreshJobDatasetSummary = async () => {}'],
])
if (scenario === 'analysis-error') {
  stubs.set(new URL('../../utils/publishableJobMetrics.js', import.meta.url).href,
    'export const analyzePublishableJobs = () => { throw new ReferenceError("shared inventory analysis code failed") }')
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'dotenv') return { url: 'data:text/javascript,export default { config() {} }', shortCircuit: true }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (stubs.has(url)) return { format: 'module', source: stubs.get(url), shortCircuit: true }
    return nextLoad(url, context)
  },
})
for (const key of Object.keys(process.env)) {
  if (/^(?:SCRAPER_|PIPELINE_)/.test(key)) delete process.env[key]
}
process.env.MONGO_URI = 'mongodb://offline.invalid/never-connected'
process.env.SCRAPER_RUN_LEASE = '0'
process.env.SCRAPER_CONCURRENCY = '1'
process.env.SCRAPER_FAILURE_ABORT_THRESHOLD = '1'
process.env.PIPELINE_SUMMARY_FILE = path.join(directory, 'summary.json')
process.on('exit', () => fs.writeFileSync(path.join(directory, 'state.json'), JSON.stringify(state)))
const runner = new URL('../../runner.js', import.meta.url)
process.argv[1] = fileURLToPath(runner)
if (scenario === 'artifact-error') process.argv.push('--dry-run')
await import(runner.href)
