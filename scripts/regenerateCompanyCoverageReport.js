import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport, getCompanyAliasMap, normalizeCompanyName } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { getScraperSourceDirectoryName } from '../scraper-support/providers/sourcePaths.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const scraperDir = path.join(backendDir, 'scraper')
export const DEFAULT_BACKEND_REPORT_PATH = path.join(backendDir, 'company_coverage_report.json')
export const DEFAULT_FRONTEND_REPORT_PATH = null

const buildReportFromScraperInventory = ({
  catalog,
  scraperDirectories = readdirSync(scraperDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
} = {}) => {
  const providersByDirectory = new Map(
    catalog.map((provider) => [getScraperSourceDirectoryName(provider), provider]),
  )
  const sourceDirs = [...scraperDirectories].sort((left, right) => left.localeCompare(right))
  const matched = sourceDirs.map((directoryName, index) => {
    const provider = providersByDirectory.get(directoryName) || null
    const source = provider?.source || directoryName
    const companyName = provider?.companyName || provider?.company || directoryName

    return {
      row: String(index + 1),
      companyName,
      normalizedCompanyName: normalizeCompanyName(companyName),
      source,
      provider: provider || null,
    }
  })

  return {
    totalRows: sourceDirs.length,
    candidateRows: sourceDirs.length,
    matchedCount: matched.length,
    unmatchedCount: 0,
    matched,
    unmatched: [],
  }
}

export const regenerateCompanyCoverageReport = ({
  csvPath,
  backendReportPath = DEFAULT_BACKEND_REPORT_PATH,
  frontendReportPath = DEFAULT_FRONTEND_REPORT_PATH,
  catalog = getScraperCatalog(),
  aliasMap = getCompanyAliasMap(),
  scraperDirectories,
  scraperDirectoryPath = scraperDir,
} = {}) => {
  const resolvedBackendReportPath = path.resolve(backendReportPath)
  const resolvedFrontendReportPath = frontendReportPath
    ? path.resolve(frontendReportPath)
    : null
  const resolvedScraperDirectoryPath = path.resolve(scraperDirectoryPath)
  const resolvedCsvPath = csvPath ? path.resolve(csvPath) : null
  const report = resolvedCsvPath
    ? generateCompanyCoverageReport({
      csvText: readFileSync(resolvedCsvPath, 'utf8'),
      catalog,
      aliasMap,
    })
    : buildReportFromScraperInventory({
      catalog,
      scraperDirectories,
    })

  const serializedReport = `${JSON.stringify(report, null, 2)}\n`
  writeFileSync(resolvedBackendReportPath, serializedReport)
  if (resolvedFrontendReportPath) {
    writeFileSync(resolvedFrontendReportPath, serializedReport)
  }

  return {
    sourceType: resolvedCsvPath ? 'csv-file' : 'scraper-directory-inventory',
    source: resolvedCsvPath || resolvedScraperDirectoryPath,
    backendReportPath: resolvedBackendReportPath,
    frontendReportPath: resolvedFrontendReportPath,
    totalRows: report.totalRows,
    candidateRows: report.candidateRows,
    matchedCount: report.matchedCount,
    unmatchedCount: report.unmatchedCount,
    unresolvedSample: report.unmatched.slice(0, 20).map((item) => item.companyName),
  }
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  const cliCsvPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : undefined
  const cliBackendReportPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : undefined
  const cliFrontendReportPath = process.argv[4]
    ? path.resolve(process.cwd(), process.argv[4])
    : undefined
  const summary = regenerateCompanyCoverageReport({
    csvPath: cliCsvPath,
    backendReportPath: cliBackendReportPath,
    frontendReportPath: cliFrontendReportPath,
  })

  console.log(JSON.stringify(summary, null, 2))
}
