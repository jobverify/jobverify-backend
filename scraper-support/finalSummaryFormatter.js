const SUMMARY_COLUMNS = [
  ['Source', 'Source'],
  ['Status', 'Status'],
  ['Jobs', 'Jobs'],
  ['New', 'New'],
  ['Updated', 'Updated'],
  ['Time', 'Time'],
]

const formatStatus = (result = {}) => (
  result.success
    ? 'OK'
    : (result.skipped ? 'Skip' : (result.softFailure ? 'Upstream' : 'Fail'))
)

const buildRows = (summary = {}) => Object.keys(summary).map((source) => {
  const result = summary[source] || {}

  return {
    Source: source,
    Status: formatStatus(result),
    Jobs: String(result.jobs || 0),
    New: String(result.inserted || 0),
    Updated: String(result.updated || 0),
    Time: `${((result.durationMs || 0) / 1000).toFixed(1)}s`,
  }
})

const computeColumnWidths = (rows) => Object.fromEntries(
  SUMMARY_COLUMNS.map(([key, header]) => [
    key,
    Math.max(
      header.length,
      ...rows.map((row) => String(row[key] || '').length),
    ),
  ]),
)

const formatRow = (row, widths) => SUMMARY_COLUMNS
  .map(([key]) => String(row[key] || '').padEnd(widths[key], ' '))
  .join(' | ')

export const formatFinalSummaryTable = (summary = {}) => {
  const rows = buildRows(summary)
  const headerRow = Object.fromEntries(SUMMARY_COLUMNS.map(([key, header]) => [key, header]))
  const widths = computeColumnWidths(rows)
  const headerLine = formatRow(headerRow, widths)

  return [
    headerLine,
    headerLine.replace(/[^|]/g, '-'),
    ...rows.map((row) => formatRow(row, widths)),
  ].join('\n')
}
