import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../../../artifacts/workbook-batches/workbook-batch-03.json'),
    'utf8',
  ),
)
const providerExtensions = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../providers/providerExtensions/workbook-batch-03.json'),
    'utf8',
  ),
)
const companyAliases = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../providers/companyAliasExtensions/workbook-batch-03.json'),
    'utf8',
  ),
)

test('Workbook batch 03 providers preserve complete exact-name manifest coverage', () => {
  const report = generateCompanyCoverageReport({
    csvText: ['company_name', ...manifest.companies].join('\n'),
    catalog: getScraperCatalog(),
  })

  assert.equal(manifest.batch, '03')
  assert.equal(manifest.total, 35)
  assert.equal(manifest.companies.length, manifest.total)
  assert.deepEqual(companyAliases, {})
  assert.equal(providerExtensions.length, manifest.total)
  assert.deepEqual(
    providerExtensions.map(({ companyName }) => companyName),
    manifest.companies,
  )
  assert.equal(report.matchedCount, manifest.companies.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.deepEqual(
    report.matched.map(({ companyName, source }) => [companyName, source]),
    providerExtensions.map(({ companyName, source }) => [companyName, source]),
  )
})
