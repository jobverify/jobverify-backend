import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.resolve(currentDir, '../../../artifacts/workbook-batches/workbook-batch-04.json')
const aliasExtensionPath = path.resolve(
  currentDir,
  '../providers/companyAliasExtensions/workbook-batch-04.json',
)

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const aliasExtensions = JSON.parse(readFileSync(aliasExtensionPath, 'utf8'))

const VERIFIED_CAREERS_EMPTY_SOURCES = [
  'nomuraindia',
  'openprise',
  'redcliffelabs',
  'securonixindia',
  'skitai',
  'slanglabs',
]

test('workbook batch 04 companies all resolve to providers after batch aliases and sentinels load', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(manifest.batch, '04')
  assert.equal(manifest.companies.length, 35)
  assert.equal(report.matchedCount, 35)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('workbook batch 04 alias extensions route the known renamed companies to existing providers', () => {
  assert.deepEqual(aliasExtensions, {
    Plum: 'plumhq',
    'Saarthi AI': 'saarthi',
    Sattva: 'sattvamedia',
  })
})

test('workbook batch 04 promotes only verified exact-company careers snapshots from the generic sentinel', () => {
  const providers = getScraperCatalog().filter((provider) =>
    VERIFIED_CAREERS_EMPTY_SOURCES.includes(provider.source),
  )

  assert.equal(providers.length, VERIFIED_CAREERS_EMPTY_SOURCES.length)
  assert.deepEqual(
    providers.map((provider) => provider.source).sort(),
    [...VERIFIED_CAREERS_EMPTY_SOURCES].sort(),
  )

  for (const provider of providers) {
    assert.equal(provider.verifiedOn, '2026-07-25')
    assert.equal(provider.verifiedPublicJobCount, 0)
    assert.equal(provider.verifiedIndiaJobCount, 0)
    assert.equal(provider.atsPlatform, 'verified-first-party-careers-empty-result')
    assert.match(provider.modulePath, /verifiedCareersEmptyState\.js$/)
  }
})
