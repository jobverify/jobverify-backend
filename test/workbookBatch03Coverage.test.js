import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../../artifacts/workbook-batches/workbook-batch-03.json'),
    'utf8',
  ),
)
const providerExtensions = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../scraper/providers/providerExtensions/workbook-batch-03.json'),
    'utf8',
  ),
)

test('Workbook batch 03 companies all resolve to exact-name providers', () => {
  const report = generateCompanyCoverageReport({
    csvText: ['company_name', ...manifest.companies].join('\n'),
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, manifest.companies.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.deepEqual(
    report.matched.map(({ companyName, source }) => [companyName, source]),
    providerExtensions.map(({ companyName, source }) => [companyName, source]),
  )
})
