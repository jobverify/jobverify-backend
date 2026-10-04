/**
 * @file Orchestrates sequential and parallel career site scraper executions.
 * @module scraper-support/runner
 */

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(currentDir, '../.env'), quiet: true })

import {
  purgeExpiredJobsForQuotaRecovery,
  saveDryRunSnapshot,
  saveToDB,
} from './utils/saveToDB.js'
import { getRetryMetadata, withRetry } from './utils/retry.js'
import { analyzePublishableJobs } from './utils/publishableJobMetrics.js'
import {
  upsertScraperStatus,
  writeScraperRun,
  readPreviousScraperRun,
  ensureScrapersSeeded,
  markPipelineRunStarted,
  markPipelineRunFinished,
} from './utils/scraperPersistence.js'
export { classifyScraperError } from './utils/failureClassification.js'
import { classifyScraperError } from './utils/failureClassification.js'
import {
  resolveParallelWorkerConcurrency,
} from './utils/parallelConcurrency.js'
import { formatFinalSummaryTable } from './finalSummaryFormatter.js'
import { installGracefulShutdownHandlers } from './utils/gracefulShutdown.js'
import { openRunCheckpoint } from './utils/runCheckpoint.js'
import { acquireMongoRunLease } from './utils/runLease.js'
import { prepareLocalLaya } from '../scripts/localLaya.js'
import { readLayaHealth, startLayaWorker } from '../scripts/layaWorker.js'
import { refreshJobDatasetSummary } from '../src/services/jobDatasetSummaryService.js'
import { DEFAULT_JOB_RETENTION_DAYS } from '../src/utils/jobLifecycle.js'
import ScraperStatus from '../src/models/ScraperStatus.js'
import { buildScrapers } from './providers/index.js'
import {
  isVerifiedEmptyEvidence,
  readInventoryEvidence,
} from './utils/inventoryEvidence.js'

const isDryRun = process.argv.includes('--dry-run')
const isParallel = process.argv.includes('--parallel')
const resolveExecutionPath = (value) => {
  if (value == null || value === '') return null

  const absolutePath = path.resolve(String(value))
  try {
    return fs.realpathSync.native(absolutePath)
  } catch {
    return absolutePath
  }
}
const DEFAULT_SCRAPER_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_WORKDAY_SCRAPER_TIMEOUT_MS = 210 * 1000
const DEFAULT_SOURCE_LIFECYCLE_TIMEOUT_MS = 30 * 60 * 1000
const DEFAULT_ABORT_GRACE_MS = 15 * 1000
const DRY_RUN_EXPERIENCE_ENRICHMENT_CONCURRENCY = 2
const DEFAULT_DRY_RUN_MAX_JOBS_TO_ENRICH = null

export const isDryRunPublicExperienceEnabled = (
  value = process.env.SCRAPER_DISABLE_DRY_RUN_PUBLIC_EXPERIENCE,
) => !/^(?:1|true|yes)$/i.test(String(value ?? '').trim())

export const resolveDryRunPublicExperienceEnabled = ({
  scraper = null,
  value = process.env.SCRAPER_DISABLE_DRY_RUN_PUBLIC_EXPERIENCE,
} = {}) => {
  if (scraper?.provider?.dryRunEnrichPublicExperience === true) return true
  if (scraper?.provider?.dryRunEnrichPublicExperience === false) return false
  return isDryRunPublicExperienceEnabled(value)
}

export const resolveDryRunMaxJobsToEnrich = (
  value = process.env.SCRAPER_DRY_RUN_MAX_JOBS_TO_ENRICH,
) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) return DEFAULT_DRY_RUN_MAX_JOBS_TO_ENRICH
  if (/^(?:all|full|unlimited)$/i.test(normalized)) return null

  const parsed = Number.parseInt(normalized, 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_DRY_RUN_MAX_JOBS_TO_ENRICH
}

export const buildDryRunSnapshotOptions = ({
  scraper = null,
  signal = null,
  onStage = null,
  enrichPublicExperience = resolveDryRunPublicExperienceEnabled({ scraper }),
  experienceEnrichmentConcurrency = DRY_RUN_EXPERIENCE_ENRICHMENT_CONCURRENCY,
  maxJobsToEnrich = resolveDryRunMaxJobsToEnrich(
    scraper?.provider?.dryRunMaxJobsToEnrich ?? process.env.SCRAPER_DRY_RUN_MAX_JOBS_TO_ENRICH,
  ),
} = {}) => ({
  enrichPublicExperience,
  experienceEnrichmentConcurrency,
  maxJobsToEnrich,
  ...(signal ? { signal } : {}),
  ...(scraper?.name ? { source: scraper.name } : {}),
  ...(onStage ? { onStage } : {}),
})

export const finalizeDirectRunnerExit = ({
  processRef = process,
  exit = null,
} = {}) => {
  const exitCode = Number.isInteger(processRef?.exitCode) ? processRef.exitCode : 0
  if (processRef && !Number.isInteger(processRef.exitCode)) {
    processRef.exitCode = exitCode
  }
  const exitFn = typeof exit === 'function' ? exit : processRef?.exit
  if (typeof exitFn === 'function') {
    exitFn(exitCode)
  }
  return exitCode
}

export const formatIstTimestamp = (timestamp = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(timestamp)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  )
  const milliseconds = String(timestamp.getUTCMilliseconds()).padStart(3, '0')

  return `${parts.year}-${parts.month}-${parts.day} -- ${parts.hour}:${parts.minute}:${parts.second}.${milliseconds} IST`
}

export const formatParallelProgressLog = (
  completedCount,
  totalScrapers,
  timestamp = new Date(),
) => `[${formatIstTimestamp(timestamp)}] [runner] Progress: ${completedCount}/${totalScrapers} scrapers finished.`

export class ScraperSourceTimeoutError extends Error {
  constructor(scraperName, timeoutMs) {
    super(`[${scraperName}] timed out after ${timeoutMs}ms`)
    this.name = 'ScraperSourceTimeoutError'
    this.localTimeout = true
    this.abortRetries = true
    this.failureKind = 'runner_timeout'
  }
}

export class ScraperSourceLifecycleTimeoutError extends Error {
  constructor(scraperName, timeoutMs) {
    super(`[${scraperName}] lifecycle timed out after ${timeoutMs}ms`)
    this.name = 'ScraperSourceLifecycleTimeoutError'
    this.localTimeout = true
    this.abortRetries = true
    this.failureKind = 'runner_lifecycle_timeout'
  }
}

const hasPuppeteerInternals = (value = '') => (
  /puppeteer|CdpCDPSession|CallbackRegistry|NodeWebSocketTransport|puppeteer-core[\\/].*common[\\/]util\.js|third_party[\\/]rxjs/i.test(value)
)

const MONGODB_STORAGE_QUOTA_PATTERNS = [
  /over your space quota/i,
  /writes are blocked on your cluster/i,
]

const collectNestedErrorText = (reason) => {
  const queue = [reason]
  const seen = new Set()
  const fragments = []

  while (queue.length > 0) {
    const current = queue.shift()
    if (current == null) continue

    const isTrackable = typeof current === 'object' || typeof current === 'function'
    if (isTrackable) {
      if (seen.has(current)) continue
      seen.add(current)
    }

    if (typeof current === 'string') {
      fragments.push(current)
      continue
    }

    for (const value of [current?.name, current?.message, current?.stack]) {
      if (value) fragments.push(String(value))
    }

    if (current?.cause) queue.push(current.cause)
    if (Array.isArray(current?.errors)) queue.push(...current.errors)
  }

  return fragments.join('\n')
}

export const isMongoStorageQuotaWriteBlockError = (error) => {
  const errorText = collectNestedErrorText(error)
  return MONGODB_STORAGE_QUOTA_PATTERNS.every((pattern) => pattern.test(errorText))
}

export class FatalScraperPersistenceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'FatalScraperPersistenceError'
    this.persistenceBlocked = true
    this.abortPipeline = true
  }
}

const toFatalScraperPersistenceError = (context, error) => {
  if (!isMongoStorageQuotaWriteBlockError(error)) return null

  return new FatalScraperPersistenceError(
    `${context}: ${error?.message || 'MongoDB Atlas writes are blocked by storage quota.'}`,
    error ? { cause: error } : undefined,
  )
}

export const isLatePuppeteerTargetClose = (reason) => {
  const reasonText = collectNestedErrorText(reason)

  return /TargetCloseError|Protocol error .*(?:Target|Session) closed|(?:Target|Session) closed/i.test(reasonText)
    && hasPuppeteerInternals(reasonText)
}

export const isLatePuppeteerWaitTimeout = (reason) => {
  const reasonText = collectNestedErrorText(reason)

  return /(?:^|\n)TimeoutError(?::|\n|$)/i.test(reasonText)
    && /Timed out after waiting \d+ms/i.test(reasonText)
    && hasPuppeteerInternals(reasonText)
}

export const shouldIgnoreUnhandledRejection = (reason) => (
  isLatePuppeteerTargetClose(reason)
  || isLatePuppeteerWaitTimeout(reason)
  || classifyScraperError(reason).softFailure === true
)

process.on('unhandledRejection', (reason) => {
  if (isLatePuppeteerTargetClose(reason)) {
    console.error('[runner] Ignored late Puppeteer browser-close rejection:', reason.message || reason)
    return
  }

  if (isLatePuppeteerWaitTimeout(reason)) {
    console.error('[runner] Ignored late Puppeteer wait-timeout rejection:', reason.message || reason)
    return
  }

  const classification = classifyScraperError(reason)
  if (classification.softFailure === true) {
    console.error(
      `[runner] Ignored late scraper soft-failure rejection (${classification.failureKind}):`,
      reason?.message || reason,
    )
    return
  }

  throw reason
})

const normalizeRequestedSource = (value) => String(value || '').trim().toLowerCase()

const buildScraperSourceLookup = (scrapers = []) => {
  const bySource = new Map()

  for (const scraper of scrapers) {
    const source = normalizeRequestedSource(scraper.name)
    bySource.set(source, scraper)
  }

  return bySource
}

const resolveRequestedScraper = (source, lookup) => {
  const normalizedSource = normalizeRequestedSource(source)
  const exact = lookup.get(normalizedSource)
  if (exact) return { scraper: exact }

  return { missing: true }
}

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
    .map((source) => normalizeRequestedSource(source))
    .filter(Boolean)
  const normalizedStartAt = normalizeRequestedSource(startAt)
  const normalizedStartAfter = normalizeRequestedSource(startAfter)

  if (requestedSources.length && (normalizedStartAt || normalizedStartAfter)) {
    throw new Error('Use SCRAPER_ONLY by itself, without SCRAPER_START_AT or SCRAPER_START_AFTER.')
  }

  if (normalizedStartAt && normalizedStartAfter) {
    throw new Error('Use only one of SCRAPER_START_AT or SCRAPER_START_AFTER.')
  }

  const lookup = buildScraperSourceLookup(scrapers)

  if (requestedSources.length) {
    const selected = []
    const missing = []
    const seen = new Set()
    const resolvedSources = new Set()

    for (const source of requestedSources) {
      if (seen.has(source)) continue
      seen.add(source)

      const resolution = resolveRequestedScraper(source, lookup)
      if (resolution.missing) {
        missing.push(source)
        continue
      }

      const scraper = resolution.scraper
      const resolvedSource = normalizeRequestedSource(scraper.name)
      if (resolvedSources.has(resolvedSource)) continue
      resolvedSources.add(resolvedSource)
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

  const resumeResolution = resolveRequestedScraper(resumeSource, lookup)
  if (resumeResolution.missing) {
    throw new Error(`Resume source "${resumeSource}" was not found in the scraper catalog.`)
  }

  const sourceIndex = scrapers.findIndex((scraper) => (
    normalizeRequestedSource(scraper.name) === normalizeRequestedSource(resumeResolution.scraper.name)
  ))
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
} = {}) => !String(onlySources || '').trim()
  && !String(startAt || '').trim()
  && !String(startAfter || '').trim()

const isWorkdayScraper = (scraper) => (
  scraper?.provider?.adapter === 'workday'
  || scraper?.provider?.atsPlatform === 'workday'
)

export const isAuthoritativeEmptyScrape = (scraper, jobs) => (
  Array.isArray(jobs)
  && jobs.length === 0
  && isVerifiedEmptyEvidence(readInventoryEvidence(jobs))
)

export const resolveZeroJobOutcome = (scraper, jobs, indiaJobs) => {
  if (!Array.isArray(indiaJobs) || indiaJobs.length > 0) return null

  const evidence = readInventoryEvidence(jobs)
  if (isVerifiedEmptyEvidence(evidence)) return 'verified-empty'
  if (evidence?.status === 'complete-inventory') return 'fetched-zero'
  if (evidence?.status === 'discovery-only') return 'blocked-zero'
  if (evidence?.status === 'coverage-gap') return 'coverage-gap'
  if (scraper?.provider?.zeroResultPolicy === 'coverage-gap') return 'coverage-gap'
  return 'unverified-zero'
}

export const getZeroJobEvidence = resolveZeroJobOutcome

export const buildCoverageGapResult = (_source, outcome) => ({
  success: false,
  softFailure: true,
  upstreamOutage: false,
  failureKind: 'coverage_gap',
  zeroJobEvidence: outcome,
})

export const resolveScraperRetryAttempts = (scraper) => (
  isWorkdayScraper(scraper) ? 1 : 4
)

export const resolveScraperTimeoutMs = (
  value = process.env.SCRAPER_SOURCE_TIMEOUT_MS,
  scraper = null,
  workdayValue = process.env.WORKDAY_SCRAPER_TIMEOUT_MS,
) => {
  const isWorkday = isWorkdayScraper(scraper)
  const configuredSourceTimeout = Number.parseInt(
    String(scraper?.timeoutMs ?? scraper?.provider?.scraperTimeoutMs ?? '').trim(),
    10,
  )
  const parsedWorkdayTimeout = Number.parseInt(workdayValue, 10)
  const defaultTimeout = isWorkday
    ? (
        Number.isFinite(configuredSourceTimeout) && configuredSourceTimeout >= 0
          ? configuredSourceTimeout
          : (
            Number.isFinite(parsedWorkdayTimeout) && parsedWorkdayTimeout >= 0
              ? parsedWorkdayTimeout
              : DEFAULT_WORKDAY_SCRAPER_TIMEOUT_MS
          )
      )
    : (
        Number.isFinite(configuredSourceTimeout) && configuredSourceTimeout >= 0
          ? configuredSourceTimeout
          : DEFAULT_SCRAPER_TIMEOUT_MS
      )

  if (value == null || value === '') return defaultTimeout

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return defaultTimeout

  return parsed
}

export const resolveSourceLifecycleTimeoutMs = (
  value = process.env.SCRAPER_SOURCE_LIFECYCLE_TIMEOUT_MS,
  scraper = null,
) => {
  const configuredSourceTimeout = Number.parseInt(
    String(
      scraper?.sourceLifecycleTimeoutMs
      ?? scraper?.provider?.sourceLifecycleTimeoutMs
      ?? scraper?.provider?.scraperLifecycleTimeoutMs
      ?? '',
    ).trim(),
    10,
  )
  const defaultTimeout = Number.isFinite(configuredSourceTimeout) && configuredSourceTimeout >= 0
    ? configuredSourceTimeout
    : DEFAULT_SOURCE_LIFECYCLE_TIMEOUT_MS

  if (value == null || value === '') return defaultTimeout

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return defaultTimeout

  return parsed
}

export const resolveLivePublicExperienceEnabled = (
  scraper = null,
  value = process.env.SCRAPER_DISABLE_LIVE_PUBLIC_EXPERIENCE,
) => {
  if (scraper?.provider?.enrichPublicExperience === true) return true
  if (scraper?.provider?.enrichPublicExperience === false) return false
  return !/^(?:1|true|yes)$/i.test(String(value ?? '').trim())
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

const waitForAbortSettlement = async (runPromise, abortGraceMs) => {
  if (!Number.isFinite(abortGraceMs) || abortGraceMs <= 0) {
    return { settled: false }
  }

  let graceTimeoutId
  try {
    return await Promise.race([
      runPromise.then(
        (value) => ({ settled: true, value }),
        (error) => ({ settled: true, error }),
      ),
      new Promise((resolve) => {
        graceTimeoutId = setTimeout(() => resolve({ settled: false }), abortGraceMs)
      }),
    ])
  } finally {
    clearTimeout(graceTimeoutId)
  }
}

const getAbortReason = (signal, fallbackMessage) => (
  signal?.reason || new Error(fallbackMessage)
)

const throwIfAborted = (signal, fallbackMessage = 'Runner operation aborted') => {
  if (signal?.aborted) {
    throw getAbortReason(signal, fallbackMessage)
  }
}

const attachParentAbort = (parentSignal, controller, onAbort = null) => {
  if (!parentSignal) return () => {}

  const abortFromParent = () => {
    const reason = getAbortReason(parentSignal, 'Runner operation aborted')
    if (!controller.signal.aborted) {
      controller.abort(reason)
    }
    if (typeof onAbort === 'function') {
      onAbort(reason)
    }
  }

  if (parentSignal.aborted) {
    abortFromParent()
    return () => {}
  }

  parentSignal.addEventListener('abort', abortFromParent, { once: true })
  return () => parentSignal.removeEventListener('abort', abortFromParent)
}

export const withSourceLifecycleTimeout = async (
  scraper,
  operation,
  timeoutMs = resolveSourceLifecycleTimeoutMs(undefined, scraper),
  { abortGraceMs = DEFAULT_ABORT_GRACE_MS, signal = null } = {},
) => {
  if (!timeoutMs && !signal) {
    return operation({ signal: null, pauseTimeout: () => {}, resumeTimeout: () => {} })
  }

  let timeoutId
  let timeoutError = null
  const controller = new AbortController()
  let parentAbortReason = null
  let rejectParentAbort
  const parentAbortPromise = new Promise((_, reject) => { rejectParentAbort = reject })
  const detachParentAbort = attachParentAbort(signal, controller, (reason) => {
    parentAbortReason = reason
    rejectParentAbort(reason)
  })
  let remainingMs = timeoutMs, timerStartedAt = 0, rejectTimeout
  const timeoutPromise = new Promise((_, reject) => { rejectTimeout = reject })
  const pauseTimeout = () => {
    if (!timeoutId) return
    clearTimeout(timeoutId)
    timeoutId = null
    remainingMs = Math.max(0, remainingMs - (Date.now() - timerStartedAt))
  }
  const resumeTimeout = () => {
    if (!timeoutMs || timeoutId || controller.signal.aborted) return
    timerStartedAt = Date.now()
    timeoutId = setTimeout(() => {
      timeoutError = new ScraperSourceLifecycleTimeoutError(scraper.name, timeoutMs)
      controller.abort(timeoutError)
      rejectTimeout(timeoutError)
    }, remainingMs)
  }
  resumeTimeout()
  const runPromise = Promise.resolve().then(() => {
    throwIfAborted(controller.signal)
    return operation({ signal: controller.signal, pauseTimeout, resumeTimeout })
  })

  try {
    return await Promise.race([
      runPromise,
      timeoutPromise,
      parentAbortPromise,
    ])
  } catch (error) {
    if (error === timeoutError || error === parentAbortReason) {
      const settlement = await waitForAbortSettlement(runPromise, abortGraceMs)
      if (settlement.settled) {
        if (settlement.error?.persistenceBlocked === true) throw settlement.error
        if (
          error === timeoutError
          && settlement.value?.success === false
          && settlement.value?.failureKind === error.failureKind
        ) {
          return settlement.value
        }
      }
      throw error
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    detachParentAbort()
  }
}

export const runScraperWithTimeout = async (
  scraper,
  timeoutMs = resolveScraperTimeoutMs(undefined, scraper),
  { abortGraceMs = DEFAULT_ABORT_GRACE_MS, signal = null } = {},
) => {
  if (!timeoutMs && !signal) return scraper.run()

  let timeoutId
  let timeoutError = null
  const controller = new AbortController()
  let parentAbortReason = null
  const detachParentAbort = attachParentAbort(signal, controller, (reason) => {
    parentAbortReason = reason
  })
  const runPromise = Promise.resolve().then(() => scraper.run({ signal: controller.signal }))

  try {
    throwIfAborted(signal)
    return await Promise.race([
      runPromise,
      timeoutMs
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              timeoutError = new ScraperSourceTimeoutError(scraper.name, timeoutMs)
              controller.abort(timeoutError)
              reject(timeoutError)
            }, timeoutMs)
          })
        : new Promise(() => {}),
      signal
        ? new Promise((_, reject) => {
            const onAbort = () => reject(getAbortReason(signal, 'Runner operation aborted'))
            signal.addEventListener('abort', onAbort, { once: true })
          })
        : new Promise(() => {}),
    ])
  } catch (error) {
    if (error === timeoutError || error === parentAbortReason) {
      await waitForAbortCleanup(runPromise, abortGraceMs)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    detachParentAbort()
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
  const invalidUrl = result.filteredInvalidUrl
    ? ` | ${result.filteredInvalidUrl} invalid URL filtered`
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
  return `${base}${updated}${nonIndia}${closed}${invalidUrl}${lifecycle}${expired}${staleCheck}`
}

const formatStageDuration = (durationMs) => (
  Number.isFinite(durationMs) ? ` in ${(durationMs / 1000).toFixed(1)}s` : ''
)

export const formatSourceStageLog = ({
  source,
  stage,
  status,
  durationMs,
  jobs,
  operations,
  processed,
  total,
  nativeComplete,
  unscanned,
  modelDecisions,
  policyDecisions,
  unresolved,
  error,
} = {}) => {
  const detailParts = []
  if (Number.isFinite(jobs)) detailParts.push(`${jobs} jobs`)
  if (Number.isFinite(operations)) detailParts.push(`${operations} ops`)
  if (Number.isFinite(processed)) detailParts.push(`${processed}/${total} processed, ${nativeComplete} complete model scans, ${unscanned} unscanned, ${modelDecisions} model labels, ${policyDecisions} policy labels, ${unresolved} unresolved`)
  if (error) detailParts.push(error)
  const details = detailParts.length ? ` (${detailParts.join(', ')})` : ''
  return `  [runner] [${source}] ${stage} ${status}${formatStageDuration(durationMs)}${details}`
}

const createSourceStageLogger = (source) => {
  let lastProgressAt = 0, lastProcessed = -1;
  return (event = {}) => {
  if (event.status === 'progress') {
    const now = Date.now();
    if (event.processed !== event.total && event.processed - lastProcessed < 25 && now - lastProgressAt < 15000) return;
    lastProgressAt = now;
    lastProcessed = event.processed;
  }
  console.log(formatSourceStageLog({
    source,
    ...event,
  }))
  }
}

const updateLiveScraperStatus = async (source, result, logStage) => {
  if (isDryRun) return

  try {
    logStage({ stage: 'status update', status: 'start' })
    await retryAfterMongoQuotaRecovery(() => upsertScraperStatus(source, result))
    logStage({ stage: 'status update', status: 'done' })
  } catch (dbErr) {
    logStage({
      stage: 'status update',
      status: 'error',
      error: dbErr?.message || String(dbErr),
    })
    const fatalPersistenceError = toFatalScraperPersistenceError(
      `[pipeline] MongoDB writes are blocked while saving status for [${source}]; aborting run`,
      dbErr,
    )
    if (fatalPersistenceError) {
      console.error(`  ${fatalPersistenceError.message}`)
      throw fatalPersistenceError
    }
    console.error(`  ERROR [${source}] Failed to save status to DB:`, dbErr.message)
  }
}

export const refreshVisibleDatasetSummaryWithLogging = async ({
  refresh = refreshJobDatasetSummary,
  logStage = createSourceStageLogger('pipeline'),
} = {}) => {
  try {
    logStage({ stage: 'dataset summary', status: 'start' })
    await refresh()
    logStage({ stage: 'dataset summary', status: 'done' })
  } catch (summaryErr) {
    logStage({
      stage: 'dataset summary',
      status: 'error',
      error: summaryErr?.message || String(summaryErr),
    })
    console.error(`  [pipeline] Failed to finalize the visible dataset:`, summaryErr.message)
  }
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

export class MissingMongoUriError extends Error {
  constructor() {
    super(
      'MONGO_URI environment variable is required for live scraper runs. ' +
      'Set it in jobverify-backend/.env or the process environment before running the scraper pipeline.',
    )
    this.name = 'MissingMongoUriError'
    this.abortPipeline = true
  }
}

export const assertLiveMongoUriConfigured = ({
  dryRun = isDryRun,
  value = process.env.MONGO_URI,
} = {}) => {
  if (dryRun) return
  if (String(value ?? '').trim()) return
  throw new MissingMongoUriError()
}

const clearDryRunArtifact = (filePath) => {
  if (!filePath) return
  fs.rmSync(filePath, { force: true })
}

/**
 * Make one bounded expired-job purge attempt, then re-run the original write
 * once. Earlier sources remain committed because source persistence is
 * independent and idempotent.
 */
export const retryAfterMongoQuotaRecovery = async (
  operation,
  {
    purgeExpiredJobs = purgeExpiredJobsForQuotaRecovery,
  } = {},
) => {
  try {
    return await operation()
  } catch (error) {
    if (!isMongoStorageQuotaWriteBlockError(error)) throw error

    let recovery
    try {
      recovery = await purgeExpiredJobs()
    } catch (purgeError) {
      console.error('[pipeline] Atlas quota recovery purge failed:', purgeError.message)
      throw error
    }

    if (!recovery || recovery.deletedCount <= 0) {
      console.error('[pipeline] Atlas quota recovery found no eligible expired jobs to remove.')
      throw error
    }

    console.warn(
      `[pipeline] Atlas quota recovery removed ${recovery.deletedCount} expired jobs ` +
      `(~${(recovery.estimatedBytes / (1024 * 1024)).toFixed(1)} MB); retrying the blocked write once.`,
    )
    return operation()
  }
}

const NON_RETRIABLE_SOFT_FAILURE_KINDS = new Set([
  'blocked_or_access_denied',
  'surface_drift_or_fail_closed',
])

export const applyRetryPolicyToScraperError = (error) => {
  if (error == null || (typeof error !== 'object' && typeof error !== 'function')) {
    return error
  }

  const classification = classifyScraperError(error)
  if (classification.softFailure !== true) {
    return error
  }

  error.softFailure = true
  error.upstreamOutage = classification.upstreamOutage
  error.failureKind = classification.failureKind

  if (
    error.abortRetries !== true
    && NON_RETRIABLE_SOFT_FAILURE_KINDS.has(classification.failureKind)
  ) {
    error.abortRetries = true
  }

  return error
}

const runScraperAttemptWithRetryPolicy = async (scraper, { signal = null } = {}) => {
  try {
    return await runScraperWithTimeout(scraper, undefined, { signal })
  } catch (error) {
    throw applyRetryPolicyToScraperError(error)
  }
}

// Runs all scrapers sequentially and saves results to MongoDB.
export const runAll = async ({ stopSignal = null } = {}) => {
  assertLiveMongoUriConfigured()

  const selected = selectScrapersForRun(buildScrapers())
  const checkpoint = process.env.SCRAPER_CHECKPOINT_FILE
    ? openRunCheckpoint({
        filePath: process.env.SCRAPER_CHECKPOINT_FILE,
        sources: selected.scrapers.map((scraper) => scraper.name),
        mode: isDryRun ? 'dry-run' : 'live',
        parallel: isParallel,
        runId: process.env.SCRAPER_RUN_ID,
      })
    : null
  const pendingSourceNames = new Set(
    checkpoint?.pendingSources(selected.scrapers.map((scraper) => scraper.name))
      ?? selected.scrapers.map((scraper) => scraper.name),
  )
  const scrapers = selected.scrapers.filter((scraper) => pendingSourceNames.has(scraper.name))
  const resumeMessage = checkpoint && scrapers.length < selected.scrapers.length
    ? `Checkpoint resume: ${scrapers.length}/${selected.scrapers.length} sources remain.`
    : selected.resumeMessage
  const summary = checkpoint?.completedSummary() || {}
  const startTime = Date.now()
  const startedAt = new Date(startTime)
  const failureAbortThreshold = resolveFailureAbortThreshold()
  const checkpointHeartbeat = checkpoint
    ? setInterval(() => checkpoint.heartbeat({
        pid: process.pid,
        rssBytes: process.memoryUsage().rss,
        heapUsedBytes: process.memoryUsage().heapUsed,
      }), 30_000)
    : null
  checkpointHeartbeat?.unref?.()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Jobverify Scraper Pipeline - ${isDryRun ? 'DRY RUN' : 'LIVE'} | ${isParallel ? 'PARALLEL' : 'SEQUENTIAL'}`)
  console.log(`  Started: ${formatIstTimestamp(startedAt)}`)
  console.log(`${'='.repeat(60)}\n`)
  if (resumeMessage) console.log(`[runner] ${resumeMessage}\n`)

  // Ensure active scrapers are seeded in the database
  if (!isDryRun) {
    try {
      await retryAfterMongoQuotaRecovery(() => ensureScrapersSeeded())
    } catch (seedErr) {
      const fatalPersistenceError = toFatalScraperPersistenceError(
        '[pipeline] MongoDB writes are blocked while seeding scraper status records; aborting run',
        seedErr,
      )
      if (fatalPersistenceError) {
        console.error(`  ${fatalPersistenceError.message}`)
        throw fatalPersistenceError
      }
      console.error('  ERROR Failed to seed scraper status records:', seedErr.message)
    }
  }

  if (!isDryRun && shouldClearExistingJobsBeforeRun()) {
    console.log(
      '[runner] Preserving existing live jobs during the full scraper run; stale roles expire source-by-source after successful persistence.\n',
    )
  }

  if (!isDryRun) {
    try {
      await retryAfterMongoQuotaRecovery(() => markPipelineRunStarted(startedAt))
    } catch (pipelineErr) {
      const fatalPersistenceError = toFatalScraperPersistenceError(
        '[pipeline] MongoDB writes are blocked while marking the pipeline as running; aborting run',
        pipelineErr,
      )
      if (fatalPersistenceError) {
        console.error(`  ${fatalPersistenceError.message}`)
        throw fatalPersistenceError
      }
      console.error('  [pipeline] Failed to mark pipeline as running:', pipelineErr.message)
    }
  }

  if (isParallel) {
    try {
      const parallelSummary = await runAllParallel({
        startedAt,
        scrapers,
        resumeMessage,
        summary,
        checkpoint,
        stopSignal,
      })
      const abortedByFailureThreshold = shouldAbortPipelineAfterFailures(
        Object.values(parallelSummary).filter(isFailureCountedForAbort).length,
        failureAbortThreshold,
      )
      checkpoint?.finish({
        interruptedBy: stopSignal?.aborted ? (stopSignal.reason?.signalName || 'signal') : null,
        error: abortedByFailureThreshold
          ? `Pipeline aborted due to too many scraper errors (>= ${failureAbortThreshold}).`
          : null,
        restartable: !abortedByFailureThreshold,
      })
      return parallelSummary
    } catch (error) {
      checkpoint?.finish({ error: error.message })
      throw error
    } finally {
      if (checkpointHeartbeat) clearInterval(checkpointHeartbeat)
    }
  }

  let failedCount = Object.values(summary).filter(isFailureCountedForAbort).length
  let startedCount = 0
  const totalScrapers = scrapers.length

  for (const scraper of scrapers) {
    if (stopSignal?.aborted) break
    startedCount++
    const progressStr = `[${startedCount}/${totalScrapers}] `
    const scraperStart = Date.now()
    const logStage = createSourceStageLogger(scraper.name)
    checkpoint?.markSourceStarted(scraper.name)

    // Skip execution if the scraper has been deactivated by an administrator
    if (!isDryRun) {
      try {
        const status = await ScraperStatus.findOne({ source: scraper.name }).lean().exec()
        if (status && status.isActive === false) {
          console.log(`  WARN ${progressStr}[${scraper.name}] is currently deactivated (isActive = false). Skipping run.\n`)
          const skippedResult = {
            success: true,
            skipped: true,
            jobs: 0,
            durationMs: Date.now() - scraperStart,
          }
          summary[scraper.name] = skippedResult
          checkpoint?.markSourceCompleted(scraper.name, skippedResult)
          continue
        }
      } catch (dbErr) {
        console.error(`  ERROR ${progressStr}[${scraper.name}] Failed to verify active status from DB:`, dbErr.message)
      }
    }

    console.log(`${progressStr}Running [${scraper.name}]...`)

    try {
      if (isDryRun) clearDryRunArtifact(scraper.dryRunFile)

      const jobs = await withRetry(
        () => runScraperAttemptWithRetryPolicy(scraper, { signal: stopSignal }),
        {
          attempts: resolveScraperRetryAttempts(scraper),
          baseDelayMs: 2000,
          label: scraper.name,
          signal: stopSignal,
        },
      )
      const publishableAnalysis = analyzePublishableJobs(jobs)
      const indiaJobs = publishableAnalysis.indiaJobs
      const zeroJobEvidence = resolveZeroJobOutcome(scraper, jobs, indiaJobs)
      const cities = [...new Set(indiaJobs.map(j => j.city).filter(Boolean))].sort()

      let result
      if (isDryRun) {
        await saveDryRunSnapshot(
          indiaJobs,
          scraper.dryRunFile,
          buildDryRunSnapshotOptions({ scraper, signal: stopSignal, onStage: logStage }),
        )
        result = {
          jobs: indiaJobs.length,
          eligibleJobs: publishableAnalysis.eligibleJobs.length,
          filteredNonIndia: publishableAnalysis.filterCounts.nonIndia,
          filteredClosed: publishableAnalysis.filterCounts.closed,
          filteredInvalidUrl: publishableAnalysis.filterCounts.invalidUrl,
          cities,
          mode: 'dry-run',
          file: scraper.dryRunFile,
        }
        console.log(`  OK [${scraper.name}] ${indiaJobs.length} India jobs -> ${scraper.dryRunFile}`)
      } else {
        result = await retryAfterMongoQuotaRecovery(() => saveToDB(jobs, scraper.name, {
          refreshDatasetSummary: false,
          authoritativeEmpty: zeroJobEvidence === 'verified-empty',
          enrichPublicExperience: resolveLivePublicExperienceEnabled(scraper),
          signal: stopSignal,
          onStage: logStage,
        }))
        result.jobs = indiaJobs.length
        result.cities = cities
        console.log(
          `  ✓ [${scraper.name}] ${indiaJobs.length} India jobs | ` +
          formatPersistenceSummary(result),
        )
      }

      if (cities.length) console.log(`  Cities: ${cities.join(', ')}`)
      if (zeroJobEvidence) result.zeroJobEvidence = zeroJobEvidence
      result.retry = getRetryMetadata(jobs)
      result.durationMs = Date.now() - scraperStart
      summary[scraper.name] = {
        success: true,
        ...result,
        ...(zeroJobEvidence === 'coverage-gap'
          ? buildCoverageGapResult(scraper.name, zeroJobEvidence)
          : {}),
      }
    } catch (err) {
      // Interrupted work must remain pending so the checkpoint resumes it.
      if (stopSignal?.aborted) break
      const fatalPersistenceError = toFatalScraperPersistenceError(
        `[pipeline] MongoDB writes are blocked while persisting jobs for [${scraper.name}]; aborting run`,
        err,
      )
      if (fatalPersistenceError) {
        console.error(`  ${fatalPersistenceError.message}`)
        throw fatalPersistenceError
      }
      const classification = classifyScraperError(err)
      const failureResult = {
        success: false,
        error: err.message,
        ...(err.classificationPending ? { classificationPending: true } : {}),
        retry: getRetryMetadata(err),
        durationMs: Date.now() - scraperStart,
        ...classification,
      }
      const failureLabel = failureResult.softFailure ? 'UPSTREAM:' : 'FAILED:'
      console.error(`  ERROR [${scraper.name}] ${failureLabel}`, err.message)
      summary[scraper.name] = failureResult
      if (isFailureCountedForAbort(failureResult)) {
        failedCount++
      }
    }

    if (!isDryRun) {
      try {
        await retryAfterMongoQuotaRecovery(() => upsertScraperStatus(scraper.name, summary[scraper.name]))
      } catch (dbErr) {
        const fatalPersistenceError = toFatalScraperPersistenceError(
          `[pipeline] MongoDB writes are blocked while saving status for [${scraper.name}]; aborting run`,
          dbErr,
        )
        if (fatalPersistenceError) {
          console.error(`  ${fatalPersistenceError.message}`)
          throw fatalPersistenceError
        }
        console.error(`  ERROR [${scraper.name}] Failed to save status to DB:`, dbErr.message)
      }
    }

    if (!summary[scraper.name]?.classificationPending) checkpoint?.markSourceCompleted(scraper.name, summary[scraper.name])

    console.log()

    if (shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)) {
      console.error(`\n  [runner] Halting sequential pipeline: ${failureAbortThreshold} scrapers have failed.`)
      break
    }
  }

  const totalMs = Date.now() - startTime
  console.log(`${'='.repeat(60)}`)
  console.log(`  Pipeline ${stopSignal?.aborted ? 'stopped' : 'complete'} in ${(totalMs / 1000).toFixed(1)}s`)
  console.log(`${'='.repeat(60)}\n`)

  if (!isDryRun) {
    await refreshVisibleDatasetSummaryWithLogging()
  }

  if (!isDryRun) {
    try {
      await retryAfterMongoQuotaRecovery(() => writeScraperRun(new Date(startTime), summary))
    } catch (dbErr) {
      console.error(`  ERROR Failed to save run history to DB:`, dbErr.message)
    }
  }

  if (!isDryRun) {
    try {
      await retryAfterMongoQuotaRecovery(() => markPipelineRunFinished({
        startedAt,
        completedAt: new Date(),
        aborted: stopSignal?.aborted || shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold),
        error: stopSignal?.aborted
          ? `Pipeline stopped by ${stopSignal.reason?.signalName || 'signal'}.`
          : (
              shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)
                ? `Pipeline aborted due to too many scraper errors (>= ${failureAbortThreshold}).`
                : null
            ),
      }))
    } catch (pipelineErr) {
      console.error(`  [pipeline] Failed to mark pipeline as complete:`, pipelineErr.message)
    }
  }

  Object.defineProperty(summary, 'runTiming', {
    value: { startedAt, completedAt: new Date() },
  })
  checkpoint?.finish({
    interruptedBy: stopSignal?.aborted ? (stopSignal.reason?.signalName || 'signal') : null,
    error: shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)
      ? `Pipeline aborted due to too many scraper errors (>= ${failureAbortThreshold}).`
      : null,
    restartable: !shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold),
  })
  if (checkpointHeartbeat) clearInterval(checkpointHeartbeat)
  return summary
}

// Runs a single scraper with retry, saves results, and updates live status.
export const runScraper = async (
  scraper,
  progressStr = '',
  persistenceOptions = {},
) => {
  const scraperStart = Date.now()
  const stageLogger = createSourceStageLogger(scraper.name)
  const logStage = event => {
    if (event.stage === 'classification') {
      if (event.status === 'start') persistenceOptions.pauseTimeout?.()
      if (['done', 'error'].includes(event.status)) persistenceOptions.resumeTimeout?.()
    }
    stageLogger(event)
  }

  // Skip execution if the scraper has been deactivated by an administrator
  if (!isDryRun) {
    try {
      const status = await ScraperStatus.findOne({ source: scraper.name }).lean().exec()
      if (status && status.isActive === false) {
        console.log(`  WARN ${progressStr}[${scraper.name}] is currently deactivated (isActive = false). Skipping run.\n`)
        return { name: scraper.name, success: true, skipped: true, jobs: 0, eligibleJobs: 0, inserted: 0, updated: 0, deleted: 0, filteredOld: 0, missed: 0, expired: 0, durationMs: 0 }
      }
    } catch (dbErr) {
      console.error(`  ERROR ${progressStr}[${scraper.name}] Failed to verify active status from DB:`, dbErr.message)
    }
  }

  console.log(`${progressStr}Starting [${scraper.name}]...`)
  const lifecycleSignal = persistenceOptions.signal || null

  try {
    throwIfAborted(lifecycleSignal)
    if (isDryRun) clearDryRunArtifact(scraper.dryRunFile)

    const scrapeStageStart = Date.now()
    logStage({ stage: 'scrape', status: 'start' })
    const jobs = await withRetry(
      () => runScraperAttemptWithRetryPolicy(scraper, { signal: lifecycleSignal }),
      {
        attempts: resolveScraperRetryAttempts(scraper),
        baseDelayMs: 2000,
        label: scraper.name,
        signal: lifecycleSignal,
      },
    )
    logStage({
      stage: 'scrape',
      status: 'done',
      durationMs: Date.now() - scrapeStageStart,
      jobs: Array.isArray(jobs) ? jobs.length : undefined,
    })
    throwIfAborted(lifecycleSignal)
    const retry = getRetryMetadata(jobs)
    const publishableAnalysis = analyzePublishableJobs(jobs)
    const indiaJobs = publishableAnalysis.indiaJobs
    const zeroJobEvidence = resolveZeroJobOutcome(scraper, jobs, indiaJobs)
    const dataQuality = indiaJobs.reduce((total, job = {}) => ({
      missingTitle: total.missingTitle + (!String(job.title || '').trim() ? 1 : 0),
      missingLocation: total.missingLocation + (!String(job.location || job.city || '').trim() ? 1 : 0),
      missingApplyUrl: total.missingApplyUrl + (!String(job.applyUrl || job.link || '').trim() ? 1 : 0),
    }), { missingTitle: 0, missingLocation: 0, missingApplyUrl: 0 })
    const cities = [...new Set(indiaJobs.map(j => j.city).filter(Boolean))].sort()

    let result
    if (isDryRun) {
      await saveDryRunSnapshot(
        indiaJobs,
        scraper.dryRunFile,
        buildDryRunSnapshotOptions({ scraper, signal: lifecycleSignal, onStage: logStage }),
      )
      result = {
        jobs: indiaJobs.length,
        eligibleJobs: publishableAnalysis.eligibleJobs.length,
        filteredNonIndia: publishableAnalysis.filterCounts.nonIndia,
        filteredClosed: publishableAnalysis.filterCounts.closed,
        filteredInvalidUrl: publishableAnalysis.filterCounts.invalidUrl,
        cities,
        mode: 'dry-run',
        file: scraper.dryRunFile,
      }
      console.log(`  OK [${scraper.name}] ${indiaJobs.length} India jobs -> ${scraper.dryRunFile}`)
    } else {
      result = await retryAfterMongoQuotaRecovery(() => saveToDB(jobs, scraper.name, {
        ...persistenceOptions,
        refreshDatasetSummary: false,
        authoritativeEmpty: zeroJobEvidence === 'verified-empty',
        enrichPublicExperience: resolveLivePublicExperienceEnabled(scraper),
        signal: lifecycleSignal,
        onStage: logStage,
      }))
      result.jobs = indiaJobs.length
      result.cities = cities
      console.log(
        `  ✓ [${scraper.name}] ${indiaJobs.length} India jobs | ` +
        formatPersistenceSummary(result),
      )
    }

    throwIfAborted(lifecycleSignal)
    if (cities.length) console.log(`  Cities: ${cities.join(', ')}`)
    if (zeroJobEvidence) result.zeroJobEvidence = zeroJobEvidence
    result.retry = retry
    result.dataQuality = dataQuality
    result.durationMs = Date.now() - scraperStart
    const successResult = {
      success: true,
      ...result,
      ...(zeroJobEvidence === 'coverage-gap'
        ? buildCoverageGapResult(scraper.name, zeroJobEvidence)
        : {}),
    }

    await updateLiveScraperStatus(scraper.name, successResult, logStage)
    throwIfAborted(lifecycleSignal)

    return { name: scraper.name, ...successResult }
  } catch (err) {
    const fatalPersistenceError = toFatalScraperPersistenceError(
      `[pipeline] MongoDB writes are blocked while persisting jobs for [${scraper.name}]; aborting run`,
      err,
    )
    if (fatalPersistenceError) {
      console.error(`  ${fatalPersistenceError.message}`)
      throw fatalPersistenceError
    }
    const classification = classifyScraperError(err)
    const failResult = {
      success: false,
      error: err.message,
      ...(err.classificationPending ? { classificationPending: true } : {}),
      retry: getRetryMetadata(err),
      durationMs: Date.now() - scraperStart,
      ...classification,
    }
    const failureLabel = failResult.softFailure ? 'UPSTREAM:' : 'FAILED:'
    console.error(`  ERROR [${scraper.name}] ${failureLabel}`, err.message)

    await updateLiveScraperStatus(scraper.name, failResult, logStage)

    return { name: scraper.name, ...failResult }
  }
}

// Runs all scrapers in a concurrency-limited worker pool to balance speed and host stability.
const runAllParallel = async ({
  startedAt = new Date(),
  scrapers = selectScrapersForRun(buildScrapers()).scrapers,
  resumeMessage = null,
  summary = {},
  checkpoint = null,
  stopSignal = null,
} = {}) => {
  const startTime = Date.now()
  let previousRun = null
  if (!isDryRun) {
    try {
      previousRun = await readPreviousScraperRun(startedAt)
    } catch (error) {
      console.error(`[runner] Previous-run analytics unavailable: ${error.message}`)
    }
  }
  const {
    effective: concurrencyLimit,
  } = resolveParallelWorkerConcurrency()
  const failureAbortThreshold = resolveFailureAbortThreshold()
  const queue = [...scrapers]
  if (resumeMessage) console.log(`[runner] ${resumeMessage}`)
  console.log(`[runner] Launching parallel worker pool with concurrency limit: ${concurrencyLimit}`)

  let failedCount = Object.values(summary).filter(isFailureCountedForAbort).length
  let startedCount = 0
  let completedCount = 0
  const totalScrapers = scrapers.length
  let fatalWorkerError = null
  const pipelineController = new AbortController()
  const detachStopSignal = attachParentAbort(stopSignal, pipelineController)

  // Worker loop that drains the shared queue
  const worker = async () => {
    while (queue.length > 0) {
      if (fatalWorkerError) break
      if (stopSignal?.aborted) break
      if (shouldAbortPipelineAfterFailures(failedCount, failureAbortThreshold)) break

      const scraper = queue.shift()
      if (!scraper) continue

      startedCount++
      const sourceStartedAt = Date.now()
      const progressStr = `[${startedCount}/${totalScrapers}] `
      let result
      let escapedError = null
      checkpoint?.markSourceStarted(scraper.name)
      try {
        result = await withSourceLifecycleTimeout(
          scraper,
          ({ signal, pauseTimeout, resumeTimeout }) => runScraper(
            scraper,
            progressStr,
            { signal, pauseTimeout, resumeTimeout },
          ),
          resolveSourceLifecycleTimeoutMs(undefined, scraper),
          { signal: pipelineController.signal },
        )
      } catch (error) {
        const failureResult = {
          name: scraper.name,
          success: false,
          error: error.message,
          durationMs: Date.now() - sourceStartedAt,
          ...classifyScraperError(error),
        }
        if (error instanceof ScraperSourceLifecycleTimeoutError) {
          console.error(`  ERROR [${scraper.name}] FAILED:`, error.message)
          try {
            await updateLiveScraperStatus(
              scraper.name,
              failureResult,
              createSourceStageLogger(scraper.name),
            )
            result = failureResult
          } catch (statusError) {
            escapedError = statusError
          }
        } else {
          escapedError = error
        }

        if (escapedError) {
          // Persistence failures and unexpected errors still stop the queue.
          fatalWorkerError ||= escapedError
          queue.length = 0
          pipelineController.abort(fatalWorkerError)
          result = {
            ...failureResult,
            error: escapedError.message,
            ...classifyScraperError(escapedError),
          }
        }
      }
      const { name, ...rest } = result
      summary[name] = rest
      if (!escapedError && !rest.classificationPending && !stopSignal?.aborted) checkpoint?.markSourceCompleted(name, rest)
      
      completedCount++
      console.log(`${formatParallelProgressLog(completedCount, totalScrapers)}\n`)

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
  try { await Promise.all(activeWorkers) }
  finally { detachStopSignal() }

  if (!isDryRun) {
    await refreshVisibleDatasetSummaryWithLogging()
  }

  if (!isDryRun) {
    try {
      await retryAfterMongoQuotaRecovery(() => writeScraperRun(new Date(startTime), summary))
    } catch (dbErr) {
      console.error(`  ERROR Failed to save run history to DB:`, dbErr.message)
    }
  }

  if (!isDryRun) {
    const totalFailures = Object.values(summary).filter(isFailureCountedForAbort).length

    try {
      await retryAfterMongoQuotaRecovery(() => markPipelineRunFinished({
        startedAt,
        completedAt: new Date(),
        aborted: stopSignal?.aborted || Boolean(fatalWorkerError) || shouldAbortPipelineAfterFailures(totalFailures, failureAbortThreshold),
        error: fatalWorkerError?.message || (
          stopSignal?.aborted
            ? `Pipeline stopped by ${stopSignal.reason?.signalName || 'signal'}.`
            : (
                shouldAbortPipelineAfterFailures(totalFailures, failureAbortThreshold)
                  ? `Pipeline aborted due to too many scraper errors (>= ${failureAbortThreshold}).`
                  : null
              )
        ),
      }))
    } catch (pipelineErr) {
      console.error(`  [pipeline] Failed to mark pipeline as complete:`, pipelineErr.message)
    }
  }

  Object.defineProperties(summary, {
    previousRun: { value: previousRun },
    runTiming: { value: { startedAt, completedAt: new Date() } },
  })
  if (fatalWorkerError) throw fatalWorkerError
  return summary
}

const directExecutionModulePath = resolveExecutionPath(fileURLToPath(import.meta.url))

// Run when invoked directly: node scraper-support/runner.js [--dry-run] [--parallel]
if (resolveExecutionPath(process.argv[1]) === directExecutionModulePath) {
  const shutdown = installGracefulShutdownHandlers()
  let runLease = null
  let classificationRuntime = null
  try {
    process.env.JOB_CLASSIFICATION_MODE ||= 'policy'
    if (process.env.JOB_CLASSIFICATION_MODE !== 'off') {
      const log = message => console.log(`[runner] ${message}`)
      // The Actions workflow and resilient supervisor have already installed and warmed this worker.
      if ((await readLayaHealth())?.ready) {
        await startLayaWorker({ env: process.env, signal: shutdown.signal, log })
      } else {
        classificationRuntime = await prepareLocalLaya({ signal: shutdown.signal, log })
        Object.assign(process.env, classificationRuntime.env)
      }
    }
    if (!isDryRun && !/^(?:0|false|no)$/i.test(String(process.env.SCRAPER_RUN_LEASE || '1'))) {
      runLease = await retryAfterMongoQuotaRecovery(() => acquireMongoRunLease({
        runId: process.env.SCRAPER_RUN_ID || null,
        onLost: (error) => {
          console.error(`[runner] MongoDB run lease lost: ${error.message}`)
          shutdown.request('SIGTERM')
        },
      }))
      console.log(`[runner] Acquired exclusive live-run lease (${runLease.ownerId}).`)
    }

    const summary = await runAll({ stopSignal: shutdown.signal })
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
    console.log(formatFinalSummaryTable(summary, {
      previousRun: summary.previousRun,
      runTiming: summary.runTiming,
    }))

    const totalFailures = Object.values(summary).filter(isFailureCountedForAbort).length
    const failureAbortThreshold = resolveFailureAbortThreshold()
    if (shouldAbortPipelineAfterFailures(totalFailures, failureAbortThreshold)) {
      console.error(`\nPipeline aborted due to too many errors (>= ${failureAbortThreshold}).`)
      process.exitCode = 1
    }
    if (Object.values(summary).some(result => result.classificationPending)) {
      console.error('Some sources still require complete Laya scans. Resume this checkpoint to retry; their jobs were not published.')
      process.exitCode = 1
    }
    if (shutdown.requested) process.exitCode = shutdown.exitCode
  } catch (err) {
    console.error('Pipeline error:', err)
    process.exitCode = Number.isInteger(err?.exitCode) ? err.exitCode : 1
  } finally {
    try { await classificationRuntime?.stop() }
    catch (error) { console.error('[runner] Failed to stop owned Laya worker:', error.message); process.exitCode = process.exitCode || 1 }
    try {
      await runLease?.release()
    } catch (error) {
      console.error('[runner] Failed to release MongoDB run lease:', error.message)
      process.exitCode = process.exitCode || 1
    }
    shutdown.dispose()
  }

  finalizeDirectRunnerExit()
}
