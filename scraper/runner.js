/**
 * @file Orchestrates sequential and parallel career site scraper executions.
 * @module scraper/runner
 */

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(currentDir, '../.env') })

import { saveToDB, saveToFile } from './utils/saveToDB.js'
import { filterIndiaJobs } from './utils/indiaLocationFilter.js'
import { withRetry } from './utils/retry.js'
import {
  upsertScraperStatus,
  writeScraperRun,
  ensureScrapersSeeded,
  markPipelineRunStarted,
  markPipelineRunFinished,
} from './utils/scraperPersistence.js'
import ScraperStatus from '../src/models/ScraperStatus.js'
import { buildScrapers } from './providers/index.js'

const isDryRun = process.argv.includes('--dry-run')
const isParallel = process.argv.includes('--parallel')
const DEFAULT_SCRAPER_TIMEOUT_MS = 5 * 60 * 1000

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

export const resolveScraperTimeoutMs = (
  value = process.env.SCRAPER_SOURCE_TIMEOUT_MS,
) => {
  if (value == null || value === '') return DEFAULT_SCRAPER_TIMEOUT_MS

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_SCRAPER_TIMEOUT_MS

  return parsed
}

export const runScraperWithTimeout = async (scraper, timeoutMs = resolveScraperTimeoutMs()) => {
  if (!timeoutMs) return scraper.run()

  let timeoutId
  try {
    return await Promise.race([
      scraper.run(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`[${scraper.name}] timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
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
  const staleCheck = result.staleCheckSkipped
    ? ` | stale cleanup skipped: ${result.staleCheckReason || 'previous source jobs preserved'}`
    : ''
  return `${base}${updated}${nonIndia} | ${result.filteredOld || 0} older than ${result.retentionDays || 10}d removed${staleCheck}`
}

export const isFailureCountedForAbort = (result = {}) => (
  result.success === false
  && result.skipped !== true
  && result.softFailure !== true
)

const getErrorText = (error = {}) => [
  error?.message,
  error?.cause?.message,
  error?.cause?.code,
  error?.code,
]
  .filter((value) => value != null && value !== '')
  .join(' ')

const BLOCKED_OR_ACCESS_DENIED_PATTERN =
  /http[\s_:-]*(?:401|403|429)\b|\b403\b|forbidden|blocked html|blocked response|captcha|challenge|unauthorized|access denied|too many requests|authorizationtoken/i

const NETWORK_OR_TIMEOUT_PATTERN =
  /http[\s_:-]*5\d\d\b|timeout|timed out|targetclose|target closed|socket|econn|enotfound|eai_again|fetch failed|\bnetwork\b|tls|und_err_connect_timeout/i

const SURFACE_DRIFT_OR_FAIL_CLOSED_PATTERN =
  /http[\s_:-]*3\d\d\b|http[\s_:-]*404\b|no longer|changed|drift|verified|no-jobs contract|no jobs contract|does not match|no longer matches|no longer exposes|now appears|now exposes|publicly enumerable|needs a structured scraper|no structured public job cards|emerged|reachable again|must be revalidated|validation failed|unable to validate|unable to find .* context|unable to resolve .* keka embed configuration/i

const PARSER_OR_CONTRACT_PATTERN =
  /http[\s_:-]*(?:400|422)\b|bad request|unprocessable|selector|parse|expected json|cannot read|undefined|not a function|not iterable/i

export const classifyScraperError = (error = {}) => {
  if (error.softFailure === true) {
    return {
      softFailure: true,
      upstreamOutage: error.upstreamOutage === true,
      failureKind: error.failureKind || (error.upstreamOutage === true ? 'upstream_outage' : 'soft_failure'),
    }
  }

  const text = getErrorText(error)

  if (BLOCKED_OR_ACCESS_DENIED_PATTERN.test(text)) {
    return {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'blocked_or_access_denied',
    }
  }

  if (NETWORK_OR_TIMEOUT_PATTERN.test(text)) {
    return {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'network_or_timeout',
    }
  }

  if (SURFACE_DRIFT_OR_FAIL_CLOSED_PATTERN.test(text)) {
    return {
      softFailure: true,
      upstreamOutage: false,
      failureKind: 'surface_drift_or_fail_closed',
    }
  }

  if (PARSER_OR_CONTRACT_PATTERN.test(text)) {
    return {
      softFailure: false,
      upstreamOutage: false,
      failureKind: 'parser_or_contract_error',
    }
  }

  return {
    softFailure: false,
    upstreamOutage: false,
    failureKind: 'hard_failure',
  }
}

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
          attempts: 3,
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
        result = await saveToDB(jobs, scraper.name)
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
      { attempts: 3, baseDelayMs: 2000, label: scraper.name },
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
      result = await saveToDB(jobs, scraper.name)
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
