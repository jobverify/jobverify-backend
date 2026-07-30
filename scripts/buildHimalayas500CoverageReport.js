import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')

const inputCsvPath = path.join(backendDir, 'artifacts', 'himalayas_500_current_hiring_companies.csv')
const outputReportPath = path.join(backendDir, 'artifacts', 'himalayas_500_company_coverage_report.json')

const csvText = readFileSync(inputCsvPath, 'utf8')
const report = generateCompanyCoverageReport({
  csvText,
  catalog: getScraperCatalog(),
})

writeFileSync(outputReportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify({
  inputCsvPath,
  outputReportPath,
  totalRows: report.totalRows,
  candidateRows: report.candidateRows,
  matchedCount: report.matchedCount,
  unmatchedCount: report.unmatchedCount,
}, null, 2))
