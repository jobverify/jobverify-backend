/**
 * @file Orchestrates sequential and parallel career site scraper executions.
 * @module scraper/runner
 */

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(currentDir, '../.env') })

import { deleteAllJobsFromDB, saveToDB, saveToFile } from './utils/saveToDB.js'
import { filterIndiaJobs } from './utils/indiaLocationFilter.js'
import { withRetry } from './utils/retry.js'
import {
  upsertScraperStatus,
  writeScraperRun,
  ensureScrapersSeeded,
  markPipelineRunStarted,
  markPipelineRunFinished,
} from './utils/scraperPersistence.js'
export { classifyScraperError } from './utils/failureClassification.js'
import { classifyScraperError } from './utils/failureClassification.js'
import { refreshJobDatasetSummary } from '../src/services/jobDatasetSummaryService.js'
import ScraperStatus from '../src/models/ScraperStatus.js'
import { buildScrapers } from './providers/index.js'

const isDryRun = process.argv.includes('--dry-run')
const isParallel = process.argv.includes('--parallel')
const DEFAULT_SCRAPER_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_WORKDAY_SCRAPER_TIMEOUT_MS = 210 * 1000
const DEFAULT_ABORT_GRACE_MS = 5 * 1000
const WORKDAY_AUTHORITATIVE_EMPTY = Symbol.for('jobify.workday.authoritative-empty')

export class ScraperSourceTimeoutError extends Error {
  constructor(scraperName, timeoutMs) {
    super(`[${scraperName}] timed out after ${timeoutMs}ms`)
    this.name = 'ScraperSourceTimeoutError'
    this.localTimeout = true
    this.abortRetries = true
    this.failureKind = 'runner_timeout'
  }
}

const isLatePuppeteerTargetClose = (reason) => {
  const message = String(reason?.message || reason || '')
  const stack = String(reason?.stack || '')

  return /TargetCloseError|Protocol error .*Target closed|Target closed/i.test(message)
    && /puppeteer|CdpCDPSession|CallbackRegistry|NodeWebSocketTransport/i.test(`${message}\n${stack}`)
}

process.on('unhandledRejection', (reason) => {
  if (isLatePuppeteerTargetClose(reason)) {
    console.error('[runner] Ignored late Puppeteer browser-close rejection:', reason.message || reason)
    return
  }

  throw reason
})

export const selectScrapersForRun = (
  scrapers,
  {
    onlySources = process.env.SCRAPER_ONLY,
    startAt = process.env.SCRAPER_START_AT,
    startAfter = process.env.SCRAPER_START_AFTER,
  } = {},
) => {
  const requestedSources = String(onlySources || '')
    .split(',')
    .map((source) => source.trim().toLowerCase())
    .filter(Boolean)
  const normalizedStartAt = String(startAt || '').trim().toLowerCase()
  const normalizedStartAfter = String(startAfter || '').trim().toLowerCase()

  if (requestedSources.length && (normalizedStartAt || normalizedStartAfter)) {
    throw new Error('Use SCRAPER_ONLY by itself, without SCRAPER_START_AT or SCRAPER_START_AFTER.')
  }

  if (normalizedStartAt && normalizedStartAfter) {
    throw new Error('Use only one of SCRAPER_START_AT or SCRAPER_START_AFTER.')
  }

  if (requestedSources.length) {
    const bySource = new Map(scrapers.map((scraper) => [scraper.name.toLowerCase(), scraper]))
    const selected = []
    const missing = []
    const seen = new Set()

    for (const source of requestedSources) {
      if (seen.has(source)) continue
      seen.add(source)

      const scraper = bySource.get(source)
      if (!scraper) {
        missing.push(source)
        continue
      }

      selected.push(scraper)
    }

    if (missing.length) {
      throw new Error(`SCRAPER_ONLY source(s) not found in the scraper catalog: ${missing.join(', ')}.`)
    }

    return {
      scrapers: selected,
      resumeMessage: `Running selected sources (${selected.length}/${scrapers.length} scrapers selected): ${selected.map((scraper) => scraper.name).join(', ')}.`,
    }
  }

  const resumeSource = normalizedStartAt || normalizedStartAfter
  if (!resumeSource) {
    return { scrapers, resumeMessage: null }
  }

  const sourceIndex = scrapers.findIndex((scraper) => scraper.name.toLowerCase() === resumeSource)
  if (sourceIndex === -1) {
    throw new Error(`Resume source "${resumeSource}" was not found in the scraper catalog.`)
  }

  const startIndex = normalizedStartAfter ? sourceIndex + 1 : sourceIndex
  const selected = scrapers.slice(startIndex)
  return {
    scrapers: selected,
    resumeMessage: `Resuming at ${selected[0]?.name || 'end of catalog'} (${selected.length}/${scrapers.length} scrapers selected).`,
  }
}

export const shouldClearExistingJobsBeforeRun = ({
  onlySources = process.env.SCRAPER_ONLY,
  startAt = process.env.SCRAPER_START_AT,
  startAfter = process.env.SCRAPER_START_AFTER,
} = {}) => {
  const hasOnlySources = String(onlySources || '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean)
    .length > 0
  const hasStartAt = String(startAt || '').trim() !== ''
  const hasStartAfter = String(startAfter || '').trim() !== ''

  return !(hasOnlySources || hasStartAt || hasStartAfter)
}

const isWorkdayScraper = (scraper) => (
  scraper?.provider?.adapter === 'workday'
  || scraper?.provider?.atsPlatform === 'workday'
)

export const isAuthoritativeEmptyScrape = (scraper, jobs) => (
  Array.isArray(jobs)
  && jobs.length === 0
  && isWorkdayScraper(scraper)
  && Object.prototype.hasOwnProperty.call(jobs, WORKDAY_AUTHORITATIVE_EMPTY)
  && jobs[WORKDAY_AUTHORITATIVE_EMPTY] === true
)

export const resolveScraperRetryAttempts = (scraper) => (
  isWorkdayScraper(scraper) ? 1 : 3
)

export const resolveScraperTimeoutMs = (
  value = process.env.SCRAPER_SOURCE_TIMEOUT_MS,
  scraper = null,
  workdayValue = process.env.WORKDAY_SCRAPER_TIMEOUT_MS,
) => {
  const isWorkday = isWorkdayScraper(scraper)
  const parsedWorkdayTimeout = Number.parseInt(workdayValue, 10)
  const defaultTimeout = isWorkday
    ? (
        Number.isFinite(parsedWorkdayTimeout) && parsedWorkdayTimeout >= 0
          ? parsedWorkdayTimeout
          : DEFAULT_WORKDAY_SCRAPER_TIMEOUT_MS
      )
    : DEFAULT_SCRAPER_TIMEOUT_MS

  if (value == null || value === '') return defaultTimeout

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return defaultTimeout

  return parsed
}

const waitForAbortCleanup = async (runPromise, abortGraceMs) => {
  if (!Number.isFinite(abortGraceMs) || abortGraceMs <= 0) return

  let graceTimeoutId
  try {
    await Promise.race([
      runPromise.catch(() => undefined),
      new Promise((resolve) => {
        graceTimeoutId = setTimeout(resolve, abortGraceMs)
      }),
    ])
  } finally {
    clearTimeout(graceTimeoutId)
  }
}

export const runScraperWithTimeout = async (
  scraper,
  timeoutMs = resolveScraperTimeoutMs(undefined, scraper),
  { abortGraceMs = DEFAULT_ABORT_GRACE_MS } = {},
) => {
  if (!timeoutMs) return scraper.run()

  let timeoutId
  let timeoutError = null
  const controller = new AbortController()
  const runPromise = Promise.resolve().then(() => scraper.run({ signal: controller.signal }))

  try {
    return await Promise.race([
      runPromise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          timeoutError = new ScraperSourceTimeoutError(scraper.name, timeoutMs)
          controller.abort(timeoutError)
          reject(timeoutError)
        }, timeoutMs)
      }),
    ])
  } catch (error) {
    if (error === timeoutError) {
      await waitForAbortCleanup(runPromise, abortGraceMs)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

const formatPersistenceSummary = (result) => {
  const base = `${result.deleted || 0} deleted | +${result.inserted} fresh`
  const updated = result.updated ? ` | ~${result.updated} updated` : ''
  const nonIndia = result.filteredNonIndia
    ? ` | ${result.filteredNonIndia} outside India removed`
    : ''
  const closed = result.filteredClosed
    ? ` | ${result.filteredClosed} past closing date`
    : ''
  const lifecycle = result.missed
    ? ` | ${result.missed} lifecycle misses`
    : ''
  const expired = result.expired
    ? ` | ${result.expired} expired`
    : ''
  const staleCheck = result.staleCheckSkipped
    ? ` | stale cleanup skipped: ${result.staleCheckReason || 'previous source jobs preserved'}`
    : ''
  return `${base}${updated}${nonIndia}${closed}${lifecycle}${expired} | ${result.filteredOld || 0} older than ${result.retentionDays || 10}d removed${staleCheck}`
}

export const isFailureCountedForAbort = (result = {}) => (
  result.success === false
  && result.skipped !== true
  && result.softFailure !== true
)

export const resolveFailureAbortThreshold = (value = process.env.SCRAPER_FAILURE_ABORT_THRESHOLD) => {
  const normalized = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(normalized) && normalized > 0
    ? normalized
    : Number.POSITIVE_INFINITY
}

export const shouldAbortPipelineAfterFailures = (
  failedCount,
  threshold = resolveFailureAbortThreshold(),
) => Number.isFinite(threshold) && failedCount >= threshold

// Runs all scrapers sequentially and saves results to MongoDB.
export const runAll = async () => {
  const { scrapers, resumeMessage } = selectScrapersForRun(buildScrapers())
  const summary = {}
  const startTime = Date.now()
  const startedAt = new Date(startTime)
  const failureAbortThreshold = resolveFailureAbortThreshold()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Jobify Scraper Pipeline — ${isDryRun ? 'DRY RUN' : 'LIVE'} | ${isParallel ? 'PARALLEL' : 'SEQUENTIAL'}`)
  console.log(`  Started: ${new Date().toISOString()}`)
  console.log(`${'='.repeat(60)}\n`)
  if (resumeMessage) console.log(`[runner] ${resumeMessage}\n`)

  if (!isDryRun && shouldClearExistingJobsBeforeRun()) {
    const deletedCount = await deleteAllJobsFromDB()
    console.log(`[runner] Cleared ${deletedCount} existing job record(s) before scraping.\n`)
  } else if (!isDryRun) {
    console.log('[runner] Selective run detected. Preserving existing jobs and refreshing only the chosen sources.\n')
  }

  // Ensure active scrapers are seeded in the database
  if (!isDryRun) {
    try {
      await ensureScrapersSeeded()
    } catch (seedErr) {
      console.error('  ✗ Failed to seed scraper status records:', seedErr.message)
    }
  }

  if (!isDryRun) {
    try {
      await markPipelineRunStarted(startedAt)
    } catch (pipelineErr) {
      console.error('  [pipeline] Failed to mark pipeline as running:', pipelineErr.message)
    }
  }

  if (isParallel) return runAllParallel(startedAt)

  let failedCount = 0
  let startedCount = 0
  const totalScrapers = scrapers.length

  for (const scraper of scrapers) {
    startedCount++
    const progressStr = `[${startedCount}/${totalScrapers}] `
    const scraperStart = Date.now()

    // Skip execution if the scraper has been deactivated by an administrator
    if (!isDryRun) {
      try {
        const status = await ScraperStatus.findOne({ source: scraper.name }).lean().exec()
        if (status && status.isActive === false) {
          console.log(`  ⚠ ${progressStr}[${scraper.name}] is currently deactivated (isActive = false). Skipping run.\n`)
          continue
        }
      } catch (dbErr) {
        console.error(`  ✗ ${progressStr}[${scraper.name}] Failed to verify active status from DB:`, dbErr.message)
      }
    }

    console.log(`▶ ${progressStr}Running [${scraper.name}]...`)

    try {
      const jobs = await withRetry(
        () => runScraperWithTimeout(scraper),
        {
          attempts: resolveScraperRetryAttempts(scraper),
          baseDelayMs: 2000,
          label: scraper.name,
        },
      )
      const indiaJobs = filterIndiaJobs(jobs)
      const cities = [...new Set(indiaJobs.map(j => j.city).filter(Boolean))].sort()

      let result
      if (isDryRun) {
        saveToFile(indiaJobs, scraper.dryRunFile)
        result = {
          jobs: indiaJobs.length,
          filteredNonIndia: Math.max(0, jobs.length - indiaJobs.length),
          cities,
          mode: 'dry-run',
          file: scraper.dryRunFile,
        }
        console.log(`  ✓ [${scraper.name}] ${indiaJobs.length} India jobs → ${scraper.dryRunFile}`)
      } else {
        result = await saveToDB(jobs, scraper.name, {
          refreshDatasetSummary: false,
          authoritativeEmpty: isAuthoritativeEmptyScrape(scraper, jobs),
        })
        result.jobs = indiaJobs.length
        result.cities = cities
        console.log(
          `  ✓ [${scraper.name}] ${indiaJobs.length} India jobs | ` +
          formatPersistenceSummary(result),
        )
      }

      if (cities.length) console.log(`  Cities: ${cities.join(', ')}`)
      result.durationMs = Date.now() - scraperStart
      summary[scraper.name] = { success: true, ...result }
    } catch (err) {
      const classification = classifyScraperError(err)
      const failureResult = {
        success: false,
        error: err.message,
        durationMs: Date.now() - scraperStart,
        ...classification,
      }
      const failureLabel = failureResult.softFailure ? 'UPSTREAM:' : 'FAILED:'
      console.error(`  ✗ [${scraper.name}] ${failureLabel}`, err.message)
      summary[scraper.name] = failureResult
      if (isFailureCountedForAbort(failureResult)) {
        failedCount++
      }
    }

    if (!isDryRun) {
      try {
        await upsertScraperStatus(scraper.name, summary[scraper.name])
      } catch (dbErr) {
        console.error(`  ✗ [${scraper.name}] Failed to save status to DB:`, dbErr.message)
      }
    }

    console.log()

    if (shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)) {
      console.error(`\n  [runner] Halting sequential pipeline: ${failureAbortThreshold} scrapers have failed.`)
      break
    }
  }

  const totalMs = Date.now() - startTime
  console.log(`${'='.repeat(60)}`)
  console.log(`  Pipeline complete in ${(totalMs / 1000).toFixed(1)}s`)
  console.log(`${'='.repeat(60)}\n`)

  if (!isDryRun) {
    try {
      await refreshJobDatasetSummary()
    } catch (summaryErr) {
      console.error(`  [pipeline] Failed to refresh dataset summary:`, summaryErr.message)
    }
  }

  if (!isDryRun) {
    try {
      await writeScraperRun(new Date(startTime), summary)
    } catch (dbErr) {
      console.error(`  ✗ Failed to save run history to DB:`, dbErr.message)
    }
  }

  if (!isDryRun) {
    try {
      await markPipelineRunFinished({
        startedAt,
        completedAt: new Date(),
        aborted: shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold),
        error: shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)
          ? `Pipeline aborted due to too many scraper errors (>= ${failureAbortThreshold}).`
          : null,
      })
    } catch (pipelineErr) {
      console.error(`  [pipeline] Failed to mark pipeline as complete:`, pipelineErr.message)
    }
  }

  return summary
}

// Runs a single scraper with retry, saves results, and updates live status.
const runScraper = async (scraper, progressStr = '') => {
  const scraperStart = Date.now()

  // Skip execution if the scraper has been deactivated by an administrator
  if (!isDryRun) {
    try {
      const status = await ScraperStatus.findOne({ source: scraper.name }).lean().exec()
      if (status && status.isActive === false) {
        console.log(`  ⚠ ${progressStr}[${scraper.name}] is currently deactivated (isActive = false). Skipping run.\n`)
        return { success: true, skipped: true, jobs: 0, eligibleJobs: 0, inserted: 0, updated: 0, deleted: 0, filteredOld: 0, missed: 0, expired: 0, durationMs: 0 }
      }
    } catch (dbErr) {
      console.error(`  ✗ ${progressStr}[${scraper.name}] Failed to verify active status from DB:`, dbErr.message)
    }
  }

  console.log(`▶ ${progressStr}Starting [${scraper.name}]...`)

  try {
    const jobs = await withRetry(
      () => runScraperWithTimeout(scraper),
      {
        attempts: resolveScraperRetryAttempts(scraper),
        baseDelayMs: 2000,
        label: scraper.name,
      },
    )
    const indiaJobs = filterIndiaJobs(jobs)
    const cities = [...new Set(indiaJobs.map(j => j.city).filter(Boolean))].sort()

    let result
    if (isDryRun) {
      saveToFile(indiaJobs, scraper.dryRunFile)
      result = {
        jobs: indiaJobs.length,
        filteredNonIndia: Math.max(0, jobs.length - indiaJobs.length),
        cities,
        mode: 'dry-run',
        file: scraper.dryRunFile,
      }
      console.log(`  ✓ [${scraper.name}] ${indiaJobs.length} India jobs → ${scraper.dryRunFile}`)
    } else {
      result = await saveToDB(jobs, scraper.name, {
        refreshDatasetSummary: false,
        authoritativeEmpty: isAuthoritativeEmptyScrape(scraper, jobs),
      })
      result.jobs = indiaJobs.length
      result.cities = cities
      console.log(
        `  ✓ [${scraper.name}] ${indiaJobs.length} India jobs | ` +
        formatPersistenceSummary(result),
      )
    }

    if (cities.length) console.log(`  Cities: ${cities.join(', ')}`)
    result.durationMs = Date.now() - scraperStart
    const successResult = { success: true, ...result }

    if (!isDryRun) {
      try {
        await upsertScraperStatus(scraper.name, successResult)
      } catch (dbErr) {
        console.error(`  ✗ [${scraper.name}] Failed to save status to DB:`, dbErr.message)
      }
    }

    return { name: scraper.name, ...successResult }
  } catch (err) {
    const classification = classifyScraperError(err)
    const failResult = {
      success: false,
      error: err.message,
      durationMs: Date.now() - scraperStart,
      ...classification,
    }
    const failureLabel = failResult.softFailure ? 'UPSTREAM:' : 'FAILED:'
    console.error(`  ✗ [${scraper.name}] ${failureLabel}`, err.message)

    if (!isDryRun) {
      try {
        await upsertScraperStatus(scraper.name, failResult)
      } catch (dbErr) {
        console.error(`  ✗ [${scraper.name}] Failed to save status to DB:`, dbErr.message)
      }
    }

    return { name: scraper.name, ...failResult }
  }
}

// Runs all scrapers in a concurrency-limited worker pool to balance speed and host stability.
const runAllParallel = async (startedAt = new Date()) => {
  const { scrapers, resumeMessage } = selectScrapersForRun(buildScrapers())
  const startTime = Date.now()
  const concurrencyLimit = parseInt(process.env.SCRAPER_CONCURRENCY || '3', 10)
  const failureAbortThreshold = resolveFailureAbortThreshold()
  const queue = [...scrapers]
  const summary = {}

  if (resumeMessage) console.log(`[runner] ${resumeMessage}`)
  console.log(`[runner] Launching parallel worker pool with concurrency limit: ${concurrencyLimit}`)

  let failedCount = 0
  let startedCount = 0
  let completedCount = 0
  const totalScrapers = scrapers.length

  // Worker loop that drains the shared queue
  const worker = async () => {
    while (queue.length > 0) {
      if (shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)) break

      const scraper = queue.shift()
      if (!scraper) continue

      startedCount++
      const progressStr = `[${startedCount}/${totalScrapers}] `
      const result = await runScraper(scraper, progressStr)
      const { name, ...rest } = result
      summary[name] = rest
      
      completedCount++
      console.log(`[runner] Progress: ${completedCount}/${totalScrapers} scrapers finished.\n`)

      if (isFailureCountedForAbort(result)) {
        failedCount++
        if (shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)) {
          console.error(`\n  [runner] Halting parallel pipeline: ${failureAbortThreshold} scrapers have failed.`)
          queue.length = 0 // empty queue to stop other workers
          break
        }
      }
    }
  }

  // Launch workers up to the concurrency limit or the number of scrapers, whichever is smaller
  const activeWorkers = Array.from(
    { length: Math.min(concurrencyLimit, scrapers.length) },
    worker
  )

  // Wait for all workers to finish draining the queue
  await Promise.all(activeWorkers)

  if (!isDryRun) {
    try {
      await refreshJobDatasetSummary()
    } catch (summaryErr) {
      console.error(`  [pipeline] Failed to refresh dataset summary:`, summaryErr.message)
    }
  }

  if (!isDryRun) {
    try {
      await writeScraperRun(new Date(startTime), summary)
    } catch (dbErr) {
      console.error(`  ✗ Failed to save run history to DB:`, dbErr.message)
    }
  }

  if (!isDryRun) {
    const totalFailures = Object.values(summary).filter(isFailureCountedForAbort).length

    try {
      await markPipelineRunFinished({
        startedAt,
        completedAt: new Date(),
        aborted: shouldAbortPipelineAfterFailures(totalFailures, failureAbortThreshold),
        error: shouldAbortPipelineAfterFailures(totalFailures, failureAbortThreshold)
          ? `Pipeline aborted due to too many scraper errors (>= ${failureAbortThreshold}).`
          : null,
      })
    } catch (pipelineErr) {
      console.error(`  [pipeline] Failed to mark pipeline as complete:`, pipelineErr.message)
    }
  }

  return summary
}

// Run when invoked directly: node scraper/runner.js [--dry-run] [--parallel]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const summary = await runAll()
    const legacyTableData = Object.keys(summary).map((source) => ({
      Source: source,
      Status: summary[source].success ? '✅ OK' : (summary[source].skipped ? '⏭️ Skip' : '❌ Fail'),
      Jobs: summary[source].jobs || 0,
      Status: summary[source].success
        ? 'âœ… OK'
        : (summary[source].skipped
          ? 'â­ï¸ Skip'
          : (summary[source].softFailure ? 'âš ï¸ Upstream' : 'âŒ Fail')),
      New: summary[source].inserted || 0,
      Updated: summary[source].updated || 0,
      Time: `${((summary[source].durationMs || 0) / 1000).toFixed(1)}s`
    }))
    const tableData = Object.keys(summary).map((source) => {
      const result = summary[source]

      return {
        Source: source,
        Status: result.success
          ? 'OK'
          : (result.skipped ? 'Skip' : (result.softFailure ? 'Upstream' : 'Fail')),
        Jobs: result.jobs || 0,
        New: result.inserted || 0,
        Updated: result.updated || 0,
        Time: `${((result.durationMs || 0) / 1000).toFixed(1)}s`,
      }
    })

    console.log('\nFinal Pipeline Summary:')
    console.table(tableData)

    const totalFailures = Object.values(summary).filter(isFailureCountedForAbort).length
    const failureAbortThreshold = resolveFailureAbortThreshold()
    if (shouldAbortPipelineAfterFailures(totalFailures, failureAbortThreshold)) {
      console.error(`\nPipeline aborted due to too many errors (>= ${failureAbortThreshold}).`)
      process.exit(1)
    }

    process.exit(0)
  } catch (err) {
    console.error('Pipeline error:', err)
    process.exit(1)
  }
}
