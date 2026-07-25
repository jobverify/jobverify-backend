import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const repoDir = path.resolve(backendDir, '..')

const backendReportPath = path.join(backendDir, 'company_coverage_report.json')
const frontendReportPath = path.join(
  repoDir,
  'Jobify-frontend',
  'public',
  'company_coverage_report.json',
)

const escapeCsvValue = (value) => {
  const text = String(value ?? '')
  if (!/[",\n\r]/.test(text)) return text

  return `"${text.replaceAll('"', '""')}"`
}

const buildCsvFromExistingReport = () => {
  const existingReport = JSON.parse(readFileSync(backendReportPath, 'utf8'))
  if (!Array.isArray(existingReport.matched)) {
    throw new Error(`${backendReportPath} does not contain a matched company list`)
  }

  return `${existingReport.matched
    .map((item) => escapeCsvValue(item.companyName))
    .join('\n')}\n`
}

const inputCsvPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null
const csvText = inputCsvPath
  ? readFileSync(inputCsvPath, 'utf8')
  : buildCsvFromExistingReport()

const report = generateCompanyCoverageReport({
  csvText,
  catalog: getScraperCatalog(),
})

const serializedReport = `${JSON.stringify(report, null, 2)}\n`
writeFileSync(backendReportPath, serializedReport)
writeFileSync(frontendReportPath, serializedReport)

console.log(JSON.stringify({
  source: inputCsvPath || backendReportPath,
  backendReportPath,
  frontendReportPath,
  totalRows: report.totalRows,
  candidateRows: report.candidateRows,
  matchedCount: report.matchedCount,
  unmatchedCount: report.unmatchedCount,
  unresolvedSample: report.unmatched.slice(0, 20).map((item) => item.companyName),
}, null, 2))
