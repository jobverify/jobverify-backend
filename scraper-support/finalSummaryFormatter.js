const RANKED_SOURCE_LIMIT = 5
const FAILURE_EXAMPLE_LIMIT = 3

const formatStatus = (result = {}) => (
  result.success
    ? 'OK'
    : (result.skipped ? 'Skip' : (result.softFailure ? 'Upstream' : 'Fail'))
)

const toFiniteNonNegative = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

const median = (values) => percentile(values, 50)

const percentile = (values, percentileValue) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const rank = Math.max(1, Math.ceil((percentileValue / 100) * sorted.length))
  return sorted[rank - 1]
}

const formatSeconds = (milliseconds) => `${(milliseconds / 1000).toFixed(1)}s`

const formatPercent = (numerator, denominator) => (
  `${(denominator > 0 ? (numerator / denominator) * 100 : 0).toFixed(1)}%`
)

const toValidDate = (value) => {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatUtcTimestamp = (value) => {
  const date = toValidDate(value)
  return date ? date.toISOString().replace('.000Z', ' UTC').replace('T', ' ') : 'unavailable'
}

const formatAsciiTable = (headers, rows) => {
  const normalizedRows = rows.map((row) => row.map((value) => String(value)))
  const widths = headers.map((header, index) => Math.max(
    header.length,
    ...normalizedRows.map((row) => (row[index] || '').length),
  ))
  const border = `+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`
  const formatRow = (row) => `| ${row.map((value, index) => String(value).padEnd(widths[index])).join(' | ')} |`

  return [border, formatRow(headers), border, ...normalizedRows.map(formatRow), border].join('\n')
}

const isTimedOut = (result = {}) => /timed?\s*out|timeout|aborted due to timeout/i.test(String(result.error || ''))

const classifyFailureGroup = (result = {}) => {
  const error = String(result.error || result.failureKind || '')
  if (isTimedOut(result)) return 'Timeout'
  if (/\bHTTP\s+4\d\d\b/i.test(error)) return 'HTTP 4xx'
  if (/\bHTTP\s+5\d\d\b/i.test(error)) return 'HTTP 5xx'
  if (/certificate|TLS|SSL|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(error)) return 'TLS/certificate'
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|queryA|fetch failed|network/i.test(error)) return 'DNS/network'
  if (/no longer matches|changed materially|no longer exposes|expected .* shape|verified .* page/i.test(error)) return 'Page contract drift'
  return 'Other'
}

const sortByMetricThenSource = (rows, metric) => [...rows].sort((left, right) => (
  metric(right) - metric(left) || left.source.localeCompare(right.source)
))

const groupFailures = (attention) => {
  const groups = new Map()
  for (const row of attention) {
    const category = classifyFailureGroup(row.result)
    const group = groups.get(category) || { category, sources: [] }
    group.sources.push(row.source)
    groups.set(category, group)
  }

  return [...groups.values()]
    .sort((left, right) => right.sources.length - left.sources.length || left.category.localeCompare(right.category))
    .map(({ category, sources }) => [
      category,
      sources.length,
      sources.slice(0, FAILURE_EXAMPLE_LIMIT).join(', '),
    ])
}

export const formatFinalSummaryTable = (summary = {}, { previousRun = null, runTiming = null } = {}) => {
  const rows = Object.entries(summary).map(([source, result = {}]) => ({ source, result }))
  const processed = rows.length
  const counts = rows.reduce((total, { result }) => {
    total[formatStatus(result)] += 1
    return total
  }, { OK: 0, Skip: 0, Upstream: 0, Fail: 0 })
  const successfulRows = rows.filter(({ result }) => formatStatus(result) === 'OK')
  const totalJobs = rows.reduce((total, { result }) => total + toFiniteNonNegative(result.jobs), 0)
  const jobsPerSource = rows.map(({ result }) => toFiniteNonNegative(result.jobs))
  const sourcesWithJobs = rows.filter(({ result }) => toFiniteNonNegative(result.jobs) > 0).length
  const zeroJobSuccesses = successfulRows.filter(({ result }) => toFiniteNonNegative(result.jobs) === 0).length
  const totalNew = rows.reduce((total, { result }) => total + toFiniteNonNegative(result.inserted), 0)
  const totalUpdated = rows.reduce((total, { result }) => total + toFiniteNonNegative(result.updated), 0)
  const durations = rows.map(({ result }) => toFiniteNonNegative(result.durationMs))
  const cumulativeDuration = durations.reduce((total, value) => total + value, 0)
  const slowest = sortByMetricThenSource(rows, ({ result }) => toFiniteNonNegative(result.durationMs))[0]
  const attention = rows.filter(({ result }) => ['Upstream', 'Fail'].includes(formatStatus(result)))
  const timedOutSources = attention.filter(({ result }) => isTimedOut(result)).length
  const dataQuality = rows.reduce((total, { result }) => ({
    missingTitle: total.missingTitle + toFiniteNonNegative(result.dataQuality?.missingTitle),
    missingLocation: total.missingLocation + toFiniteNonNegative(result.dataQuality?.missingLocation),
    missingApplyUrl: total.missingApplyUrl + toFiniteNonNegative(result.dataQuality?.missingApplyUrl),
  }), { missingTitle: 0, missingLocation: 0, missingApplyUrl: 0 })
  const publishableFilters = rows.reduce((total, { result }) => ({
    eligibleJobs: total.eligibleJobs + toFiniteNonNegative(result.eligibleJobs),
    filteredNonIndia: total.filteredNonIndia + toFiniteNonNegative(result.filteredNonIndia),
    filteredOld: total.filteredOld + toFiniteNonNegative(result.filteredOld),
    filteredClosed: total.filteredClosed + toFiniteNonNegative(result.filteredClosed),
    filteredInvalidUrl: total.filteredInvalidUrl + toFiniteNonNegative(result.filteredInvalidUrl),
  }), {
    eligibleJobs: 0,
    filteredNonIndia: 0,
    filteredOld: 0,
    filteredClosed: 0,
    filteredInvalidUrl: 0,
  })
  const retriedRows = rows.filter(({ result }) => Number(result.retry?.retries) > 0)
  const totalAttempts = rows.reduce((total, { result }) => total + Number(result.retry?.attemptsUsed || 1), 0)
  const retryDelayMs = rows.reduce((total, { result }) => total + toFiniteNonNegative(result.retry?.retryDelayMs), 0)
  const startedAt = toValidDate(runTiming?.startedAt)
  const completedAt = toValidDate(runTiming?.completedAt)
  const elapsedMs = startedAt && completedAt
    ? Math.max(0, completedAt.getTime() - startedAt.getTime())
    : null
  const previousSources = previousRun?.sources || null
  const previousEntries = previousSources ? Object.entries(previousSources) : []
  const previousJobs = previousRun?.overall?.totalJobs ?? null
  const previousSucceeded = previousRun?.overall?.sourcesSucceeded ?? null
  const previousZeroJobSources = previousSources
    ? new Set(previousEntries.filter(([, result]) => Number(result.jobsFound || 0) === 0).map(([source]) => source))
    : null
  const zeroNowSources = successfulRows.filter(({ result }) => toFiniteNonNegative(result.jobs) === 0).map(({ source }) => source)
  const knownEmpty = previousZeroJobSources ? zeroNowSources.filter((source) => previousZeroJobSources.has(source)) : null
  const needsReview = previousSources ? zeroNowSources.filter((source) => !previousZeroJobSources.has(source)) : null
  const delta = (current, previous) => previous == null ? 'unavailable' : `${current - previous >= 0 ? '+' : ''}${current - previous}`
  const sourceChanges = previousSources
    ? rows.map(({ source, result }) => {
      const previous = Number(previousSources[source]?.jobsFound || 0)
      const current = toFiniteNonNegative(result.jobs)
      return { source, previous, current, change: current - previous }
    }).filter(({ change }) => change !== 0)
      .sort((left, right) => Math.abs(right.change) - Math.abs(left.change) || left.source.localeCompare(right.source))
      .slice(0, RANKED_SOURCE_LIMIT)
    : null
  const topJobSources = sortByMetricThenSource(
    rows.filter(({ result }) => toFiniteNonNegative(result.jobs) > 0),
    ({ result }) => toFiniteNonNegative(result.jobs),
  ).slice(0, RANKED_SOURCE_LIMIT)
  const topSlowestSources = sortByMetricThenSource(
    rows,
    ({ result }) => toFiniteNonNegative(result.durationMs),
  ).slice(0, RANKED_SOURCE_LIMIT)
  const topJobShare = topJobSources.reduce(
    (total, { result }) => total + toFiniteNonNegative(result.jobs),
    0,
  )

  const sections = [
    'Analytical Pipeline Summary',
    'RUN TIMING',
    formatAsciiTable(['Metric', 'Value'], [
      ['Start time', formatUtcTimestamp(startedAt)],
      ['End time', formatUtcTimestamp(completedAt)],
      ['Total time taken', elapsedMs == null ? 'unavailable' : formatSeconds(elapsedMs)],
      ['Cumulative worker time', formatSeconds(cumulativeDuration)],
    ]),
    'RUN HEALTH',
    formatAsciiTable(['Metric', 'Value'], [
      ['Sources processed', processed],
      ['Successful', counts.OK],
      ['Skipped', counts.Skip],
      ['Upstream issues', counts.Upstream],
      ['Failed', counts.Fail],
      ['Success rate', formatPercent(counts.OK, processed)],
      ['Successful-source rate', formatPercent(counts.OK, processed)],
      ['Zero-job successes', zeroJobSuccesses],
    ]),
    'JOB YIELD',
    formatAsciiTable(['Metric', 'Value'], [
      ['India jobs returned', totalJobs],
      ['Sources with jobs', sourcesWithJobs],
      ['Job-yield rate', formatPercent(sourcesWithJobs, processed)],
      ['Average jobs/source', processed > 0 ? (totalJobs / processed).toFixed(1) : '0.0'],
      ['Median jobs/source', median(jobsPerSource).toFixed(1)],
      ['Top-5 source share', formatPercent(topJobShare, totalJobs)],
      ['New jobs', totalNew],
      ['Updated jobs', totalUpdated],
    ]),
    'PUBLISHABLE FILTERS',
    formatAsciiTable(['Metric', 'Value'], [
      ['Publishable jobs', publishableFilters.eligibleJobs],
      ['Publishable rate', formatPercent(publishableFilters.eligibleJobs, totalJobs)],
      ['Rejected outside India', publishableFilters.filteredNonIndia],
      ['Rejected older than retention', publishableFilters.filteredOld],
      ['Rejected past closing date', publishableFilters.filteredClosed],
      ['Rejected invalid URL', publishableFilters.filteredInvalidUrl],
    ]),
    'PERFORMANCE',
    formatAsciiTable(['Metric', 'Value'], [
      ['Parallelism factor', elapsedMs && elapsedMs > 0 ? `${(cumulativeDuration / elapsedMs).toFixed(1)}x` : 'unavailable'],
      ['Median source runtime', formatSeconds(median(durations))],
      ['P95 source runtime', formatSeconds(percentile(durations, 95))],
      ['Slowest source', slowest ? `${slowest.source} (${formatSeconds(toFiniteNonNegative(slowest.result.durationMs))})` : 'none'],
      ['Timed-out sources', timedOutSources],
    ]),
    'DATA QUALITY',
    formatAsciiTable(['Metric', 'Value'], [
      ['Missing title', dataQuality.missingTitle],
      ['Missing-title rate', formatPercent(dataQuality.missingTitle, totalJobs)],
      ['Missing location', dataQuality.missingLocation],
      ['Missing-location rate', formatPercent(dataQuality.missingLocation, totalJobs)],
      ['Missing application URL', dataQuality.missingApplyUrl],
      ['Missing-application-URL rate', formatPercent(dataQuality.missingApplyUrl, totalJobs)],
    ]),
    'RETRY AND TIMEOUT PRESSURE',
    formatAsciiTable(['Metric', 'Value'], [
      ['Sources retried', retriedRows.length],
      ['Total retry attempts', Math.max(0, totalAttempts - processed)],
      ['Retry recovery rate', formatPercent(retriedRows.filter(({ result }) => result.success).length, retriedRows.length)],
      ['Timed-out sources', timedOutSources],
      ['Time spent retrying', formatSeconds(retryDelayMs)],
    ]),
    'ZERO-YIELD WATCHLIST',
    formatAsciiTable(['Metric', 'Value'], [
      ['Successful zero-job sources', zeroNowSources.length],
      ['Known empty sources', knownEmpty == null ? 'unavailable' : knownEmpty.length],
      ['Needs review', needsReview == null ? 'unavailable' : needsReview.length],
      ['Prior-non-empty examples', needsReview == null ? 'unavailable' : (needsReview.slice(0, 5).join(', ') || 'none')],
    ]),
    'RUN-OVER-RUN CHANGE',
    formatAsciiTable(['Metric', 'Current', 'Previous', 'Change'], [
      ['India jobs', totalJobs, previousJobs ?? 'unavailable', delta(totalJobs, previousJobs)],
      ['Successful sources', counts.OK, previousSucceeded ?? 'unavailable', delta(counts.OK, previousSucceeded)],
      ['Timed-out sources', timedOutSources, 'unavailable', 'unavailable'],
    ]),
    'SOURCE-CHANGE ANOMALIES',
    formatAsciiTable(['Source', 'Previous', 'Current', 'Change'], sourceChanges == null
      ? [['unavailable', '-', '-', '-']]
      : (sourceChanges.length > 0
        ? sourceChanges.map(({ source, previous, current, change }) => [source, previous, current, `${change >= 0 ? '+' : ''}${change}`])
        : [['none', 0, 0, '0']])),
    'TOP JOB YIELDS',
    formatAsciiTable(['Source', 'Jobs', 'Share'], topJobSources.length > 0
      ? topJobSources.map(({ source, result }) => [
        source,
        toFiniteNonNegative(result.jobs),
        formatPercent(toFiniteNonNegative(result.jobs), totalJobs),
      ])
      : [['none', 0, '0.0%']]),
    'TOP SLOWEST SOURCES',
    formatAsciiTable(['Source', 'Duration', 'Status', 'Jobs'], topSlowestSources.length > 0
      ? topSlowestSources.map(({ source, result }) => [
        source,
        formatSeconds(toFiniteNonNegative(result.durationMs)),
        formatStatus(result),
        toFiniteNonNegative(result.jobs),
      ])
      : [['none', '0.0s', 'n/a', 0]]),
    'FAILURE GROUPS',
    formatAsciiTable(['Category', 'Sources', 'Examples'], groupFailures(attention).length > 0
      ? groupFailures(attention)
      : [['None', 0, 'none']]),
  ]

  return sections.join('\n\n')
}
