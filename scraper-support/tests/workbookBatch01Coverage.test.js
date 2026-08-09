import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import dedicatedProviders from '../providers/providerExtensions/zz-dedicated-scraper-folder-backfill.json' with { type: 'json' }
import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const scraperDir = path.resolve(currentDir, '..', '..', 'scraper')
const manifest = {
  batch: '01',
  companies: dedicatedProviders
    .filter((provider) => provider.originalModulePath === '../workbookbatch01/failClosedSentinel.js')
    .map((provider) => provider.companyName),
}

test('workbook batch 01 companies all resolve to providers', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(manifest.batch, '01')
  assert.equal(manifest.companies.length, 35)
  assert.equal(report.matchedCount, manifest.companies.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('workbook batch 01 sentinels are registered and stay fail-closed', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))
  const manifestCompanies = new Set(manifest.companies)
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog,
    aliasMap: getCompanyAliasMap(),
  })
  const batchProviders = report.matched.map(({ source }) => dedicatedProviders.find((provider) => provider.source === source))

  assert.equal(batchProviders.length, manifest.companies.length)
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
    assert.equal(catalogProvider.modulePath, path.join(scraperDir, provider.source, 'script.js'))
    assert.equal(catalogProvider.originalModulePath, '../workbookbatch01/failClosedSentinel.js')
    assert.equal(catalogProvider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(
      catalogProvider.extractionStrategy,
      'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified',
    )
    assert.equal(catalogProvider.verifiedOn, '2026-07-25')
    assert.equal(catalogProvider.verifiedPublicJobCount, 0)
    assert.equal(catalogProvider.verifiedIndiaJobCount, 0)
    assert.equal(catalogProvider.dryRunFile, path.join(scraperDir, provider.source, 'jobs.json'))
    assert.match(catalogProvider.verifiedSurfaceSummary, new RegExp(`exact-name sentinel for ${provider.companyName}`))
    assert.match(
      catalogProvider.verifiedSurfaceSummary,
      /intentionally returns zero jobs until a trustworthy public careers surface is verified/,
    )
    assert.deepEqual(await scraper.run(), [])
  }
})
