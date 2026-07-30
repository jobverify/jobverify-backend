import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { syncCompanyCoverageReportsFromScraper } from '../scripts/syncCompanyCoverageReportsFromScraper.js'

test('syncCompanyCoverageReportsFromScraper writes only cataloged scraper sources and removes the deprecated report', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'jobify-company-coverage-sync-'))

  try {
    const backendReportPath = path.join(tempDir, 'company_coverage_report.json')
    const frontendReportPath = path.join(tempDir, 'live_hiring_companies.json')
    const deprecatedFrontendRawReportPath = path.join(tempDir, 'deprecated-company-coverage-report.json')
    const sharedDryRunDir = path.join(tempDir, 'workbookbatch')
    const sharedDryRunFile = path.join(sharedDryRunDir, 'gamma.jobs.json')
    writeFileSync(deprecatedFrontendRawReportPath, '{"stale":true}\n', 'utf8')
    mkdirSync(sharedDryRunDir, { recursive: true })
    writeFileSync(sharedDryRunFile, '[]\n', 'utf8')

    const summary = syncCompanyCoverageReportsFromScraper({
      catalog: [
        { source: 'alpha', companyName: 'Alpha' },
        { source: 'beta', companyName: 'Beta Labs' },
        {
          source: 'gamma',
          companyName: 'Gamma Shared',
          dryRunFile: sharedDryRunFile,
        },
      ],
      scraperDirectories: ['helpers', 'beta', 'alpha'],
      backendReportPath,
      frontendReportPath,
      deprecatedFrontendRawReportPath,
    })

    assert.deepEqual(summary.skippedDirs, ['helpers'])
    assert.equal(summary.matchedCount, 3)

    const backendReport = JSON.parse(readFileSync(backendReportPath, 'utf8'))
    const frontendCompanies = JSON.parse(readFileSync(frontendReportPath, 'utf8'))
    assert.deepEqual(backendReport.matched.map((row) => row.source), ['alpha', 'beta', 'gamma'])
    assert.deepEqual(frontendCompanies, ['Alpha', 'Beta Labs', 'Gamma Shared'])
    assert.equal(existsSync(deprecatedFrontendRawReportPath), false)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})
