import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import batchProviders from '../providers/providerExtensions/workbook-batch-01.json' with { type: 'json' }
import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.resolve(currentDir, '../../../artifacts/workbook-batches/workbook-batch-01.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

test('workbook batch 01 companies all resolve to providers', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(manifest.batch, '01')
  assert.equal(manifest.companies.length, 35)
  assert.equal(report.matchedCount, 35)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('workbook batch 01 sentinels are registered and stay fail-closed', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))
  const manifestCompanies = new Set(manifest.companies)

  assert.equal(batchProviders.length, 35)
  assert.deepEqual(
    batchProviders.map((provider) => provider.companyName),
    manifest.companies,
  )

  for (const provider of batchProviders) {
    const catalogProvider = catalog.find((item) => item.source === provider.source)
    const scraper = scrapersByName.get(provider.source)

    assert.ok(manifestCompanies.has(provider.companyName))
    assert.ok(catalogProvider)
    assert.ok(scraper)
    assert.equal(catalogProvider.companyName, provider.companyName)
    assert.equal(catalogProvider.modulePath, '../workbookbatch01/failClosedSentinel.js')
    assert.equal(catalogProvider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(
      catalogProvider.extractionStrategy,
      'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified',
    )
    assert.equal(catalogProvider.verifiedOn, '2026-07-25')
    assert.equal(catalogProvider.verifiedPublicJobCount, 0)
    assert.equal(catalogProvider.verifiedIndiaJobCount, 0)
    assert.match(catalogProvider.verifiedSurfaceSummary, new RegExp(`exact-name sentinel for ${provider.companyName}`))
    assert.match(catalogProvider.verifiedSurfaceSummary, /intentionally returns zero jobs until a trustworthy public careers surface is verified/)
    assert.deepEqual(await scraper.run(), [])
  }
})
