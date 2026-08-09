import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import mongoose from 'mongoose'

import connectDB from '../db/db.js'
import Job from '../src/models/Job.js'
import { normalizeCompanyNameExact } from '../scraper-support/providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const reportPath = path.join(backendDir, 'company_coverage_report.json')
const runLogDir = path.join(backendDir, 'artifacts', 'run-logs')
const outputDir = path.join(backendDir, 'artifacts', 'coverage-gap-analysis')

const getRunLogPairs = () => {
  if (!existsSync(runLogDir)) return []

  const groups = new Map()
  for (const entry of readdirSync(runLogDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:out|err)\.log$/i.test(entry.name)) continue

    const prefix = entry.name.replace(/\.(?:out|err)\.log$/i, '')
    const group = groups.get(prefix) || {
      prefix,
      out: null,
      err: null,
      mtimeMs: 0,
    }
    const logPath = path.join(runLogDir, entry.name)

    if (/\.out\.log$/i.test(entry.name)) group.out = entry.name
    if (/\.err\.log$/i.test(entry.name)) group.err = entry.name
    group.mtimeMs = Math.max(group.mtimeMs, statSync(logPath).mtimeMs)
    groups.set(prefix, group)
  }

  return [...groups.values()]
    .sort((left, right) => left.mtimeMs - right.mtimeMs || left.prefix.localeCompare(right.prefix))
    .map((group) => [group.out, group.err].filter(Boolean))
}

const readRunLogText = (logPath) => {
  const buffer = readFileSync(logPath)
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le')
  }

  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return buffer.swap16().toString('utf16le')
  }

  return buffer.toString('utf8')
}

export const isLogRecordBoundary = (line = '') => (
  /^\s*▶\s+\[\d+\//.test(line)
  || /^\s*[✓✔✗]\s+\[[^\]]+\]\s+(?:\d+\s+India jobs|FAILED:|UPSTREAM:)/.test(line)
  || /\[[^\]]+\]\s+Failed to save status to DB:/i.test(line)
  || /\[\d+\/\d+\]\s+\[[^\]]+\]\s+Failed to verify active status from DB:/i.test(line)
  || /^\s*\[retry:[^\]]+\]/.test(line)
  || /^\[runner\]/.test(line)
  || /^\(node:\d+\)/.test(line)
  || /^MongoDB\b/.test(line)
  || /^ERROR:\s+The process\b/i.test(line)
  || /^Total\b/.test(line)
  || /^Cities found\b/.test(line)
)

export const collectFailureContinuation = (lines, startIndex) => {
  const parts = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (!trimmed) break
    if (isLogRecordBoundary(line)) break

    parts.push(trimmed)
  }

  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

export const parsePipelineRowsFromLogGroups = (logGroups = []) => {
  const latestBySource = new Map()
  const startedSources = new Set()

  for (const { runOrder = 0, logName = null, text = '' } of logGroups) {
    const lines = String(text).split(/\r?\n/)

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const startedMatch = line.match(/(?:Starting|Running) \[([^\]]+)\]/)
      if (startedMatch) {
        startedSources.add(startedMatch[1])
      }

      const successMatch = line.match(/^\s*(?:\S+\s+)?\[([^\]]+)\]\s+(\d+)\s+India jobs\b(.*)$/)
      if (successMatch && !/\bPage\s+\d+:/i.test(line)) {
        const [, source, jobsText, detail] = successMatch
        latestBySource.set(source, {
          source,
          status: 'OK',
          jobs: Number(jobsText),
          detail: detail.trim(),
          staleCleanupSkipped: /stale cleanup skipped/i.test(detail),
          runOrder,
          logName,
        })
        continue
      }

      const failureMatch = line.match(/^\s*(?:\S+\s+)?\[([^\]]+)\]\s+(FAILED|UPSTREAM):\s*(.*)$/i)
      if (failureMatch) {
        const [, source, statusLabel, errorText] = failureMatch
        const error = `${errorText.trim()}${collectFailureContinuation(lines, index)}`
        latestBySource.set(source, {
          source,
          status: /^UPSTREAM$/i.test(statusLabel) ? 'Upstream' : 'Fail',
          jobs: 0,
          error,
          runOrder,
          logName,
        })
      }
    }
  }

  return { latestBySource, startedSources }
}

const parseLatestPipelineRows = () => {
  const logGroups = []
  let runOrder = 0

  for (const logPair of getRunLogPairs()) {
    runOrder += 1

    for (const logName of logPair) {
      const logPath = path.join(runLogDir, logName)
      logGroups.push({
        runOrder,
        logName,
        text: readRunLogText(logPath),
      })
    }
  }

  return parsePipelineRowsFromLogGroups(logGroups)
}

export const bucketFailure = (error = '') => {
  const text = error.toLowerCase()
  if (
    /http[\s_:-]*(?:401|403|429)\b|\b403\b|forbidden|blocked html|blocked response|captcha|challenge|unauthorized|access denied|too many requests|authorizationtoken/.test(
      text,
    )
  ) {
    return 'failed_blocked_or_access_denied'
  }
  if (/http[\s_:-]*5\d\d\b|timeout|timed out|targetclose|target closed|socket|econn|enotfound|fetch failed|\bnetwork\b|tls/.test(text)) {
    return 'failed_network_or_timeout'
  }
  if (
    /http[\s_:-]*3\d\d\b|http[\s_:-]*404\b|no longer|changed|drift|verified|no-jobs contract|no jobs contract|does not match|no longer matches|no longer exposes|now appears|now exposes|publicly enumerable|needs a structured scraper|no structured public job cards|emerged|reachable again|must be revalidated|validation failed|unable to validate|unable to find .* context|unable to resolve .* keka embed configuration/.test(
      text,
    )
  ) {
    return 'failed_surface_drift_or_fail_closed'
  }
  if (/http[\s_:-]*(?:400|422)\b|bad request|unprocessable|selector|parse|expected|cannot|undefined|not a function|not iterable/.test(text)) {
    return 'failed_parser_or_contract_error'
  }
  return 'failed_other'
}

export const bucketSoftFailure = (error = '') =>
  bucketFailure(error).replace(/^failed_/, 'pipeline_soft_')

const SOFT_FAILURE_BUCKETS = new Set([
  'failed_blocked_or_access_denied',
  'failed_network_or_timeout',
  'failed_surface_drift_or_fail_closed',
])

export const bucketPipelineFailure = (pipeline = {}) => {
  const failureBucket = bucketFailure(pipeline.error || '')

  if (pipeline.status === 'Upstream' || SOFT_FAILURE_BUCKETS.has(failureBucket)) {
    return failureBucket.replace(/^failed_/, 'pipeline_soft_')
  }

  return failureBucket
}

const countBy = (items, keyer) => {
  const counts = new Map()
  for (const item of items) {
    const key = keyer(item)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Object.fromEntries([...counts.entries()].sort())
}

const sortRows = (rows) =>
  [...rows].sort((left, right) =>
    left.category.localeCompare(right.category)
    || left.source.localeCompare(right.source)
    || left.companyName.localeCompare(right.companyName))

const main = async () => {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'))
  const { latestBySource, startedSources } = parseLatestPipelineRows()

  await connectDB()

  try {
    const [activeBySourceRows, activeCompanies] = await Promise.all([
      Job.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$source',
            jobs: { $sum: 1 },
            companies: { $addToSet: '$company' },
          },
        },
      ]),
      Job.distinct('company', { status: 'active' }),
    ])

    const coverageCompanyNames = new Set(
      report.matched.map((row) => normalizeCompanyNameExact(row.companyName)),
    )
    const activeCompanyNames = new Set(
      activeCompanies.filter(Boolean).map(normalizeCompanyNameExact),
    )
    const activeBySource = new Map(
      activeBySourceRows.map((row) => [row._id, {
        jobs: row.jobs,
        companies: row.companies.filter(Boolean).sort(),
      }]),
    )

    const rows = report.matched.map((coverageRow) => {
      const pipeline = latestBySource.get(coverageRow.source)
      const activeSource = activeBySource.get(coverageRow.source) || {
        jobs: 0,
        companies: [],
      }
      const sourceActive = activeSource.jobs > 0
      const exactActive = activeCompanyNames.has(
        normalizeCompanyNameExact(coverageRow.companyName),
      )

      let category
      if (sourceActive) {
        category = exactActive
          ? 'active_exact_or_same_name'
          : 'active_under_alias_or_provider_name'
      } else if (pipeline?.status === 'OK' && pipeline.staleCleanupSkipped && pipeline.jobs > 0) {
        category = 'scraped_raw_jobs_but_0_eligible_after_filters'
      } else if (pipeline?.status === 'OK' && pipeline.jobs === 0) {
        category = 'pipeline_ok_0_jobs'
      } else if (pipeline?.status === 'OK') {
        category = 'pipeline_ok_but_no_active_source_docs'
      } else if (pipeline?.status === 'Upstream' || pipeline?.status === 'Fail') {
        category = bucketPipelineFailure(pipeline)
      } else if (startedSources.has(coverageRow.source)) {
        category = 'started_but_no_completion_line_in_interrupted_run'
      } else {
        category = 'not_seen_in_pipeline_logs'
      }

      return {
        companyName: coverageRow.companyName,
        source: coverageRow.source,
        providerCompany: coverageRow.provider?.companyName || coverageRow.provider?.company || null,
        category,
        sourceActive,
        exactActive,
        activeSourceJobs: activeSource.jobs,
        activeCompaniesForSource: activeSource.companies,
        pipelineStatus: pipeline?.status || null,
        pipelineJobs: pipeline?.jobs ?? null,
        staleCleanupSkipped: pipeline?.staleCleanupSkipped || false,
        pipelineError: pipeline?.error || null,
        pipelineDetail: pipeline?.detail || null,
      }
    })

    const noActiveSourceRows = rows.filter((row) => !row.sourceActive)
    const summary = {
      generatedAt: new Date().toISOString(),
      trackedCoverageRows: report.matched.length,
      uniqueCoverageSources: new Set(report.matched.map((row) => row.source)).size,
      mongoActiveDistinctCompanies: activeCompanies.filter(Boolean).length,
      mongoActiveCompaniesExactMatchedToCoverageNames: [...activeCompanyNames]
        .filter((name) => coverageCompanyNames.has(name)).length,
      mongoActiveCompaniesNotExactCoverageNames: [...activeCompanyNames]
        .filter((name) => !coverageCompanyNames.has(name)).length,
      coverageRowsWithActiveSource: rows.filter((row) => row.sourceActive).length,
      coverageRowsWithoutActiveSource: noActiveSourceRows.length,
      coverageRowsWithExactActiveCompanyName: rows.filter((row) => row.exactActive).length,
      coverageRowsWithoutExactActiveCompanyName: rows.filter((row) => !row.exactActive).length,
      pipelineParsedSources: latestBySource.size,
      categoryCountsAcrossCoverageRows: countBy(rows, (row) => row.category),
      noActiveSourceCategoryCounts: countBy(noActiveSourceRows, (row) => row.category),
    }

    mkdirSync(outputDir, { recursive: true })
    for (const entry of readdirSync(outputDir, { withFileTypes: true })) {
      if (entry.isFile() && /\.json$/i.test(entry.name)) {
        rmSync(path.join(outputDir, entry.name))
      }
    }

    writeFileSync(
      path.join(outputDir, 'latest-summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
    )
    writeFileSync(
      path.join(outputDir, 'latest-rows.json'),
      `${JSON.stringify(sortRows(rows), null, 2)}\n`,
    )

    for (const [category] of Object.entries(summary.categoryCountsAcrossCoverageRows)) {
      const categoryRows = rows.filter((row) => row.category === category)
      writeFileSync(
        path.join(outputDir, `${category}.json`),
        `${JSON.stringify(sortRows(categoryRows), null, 2)}\n`,
      )
    }

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await mongoose.disconnect()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
