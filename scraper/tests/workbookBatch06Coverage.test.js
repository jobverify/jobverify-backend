import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import batchProviders from '../providers/providerExtensions/workbook-batch-06.json' with { type: 'json' }
import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.resolve(currentDir, '../../../artifacts/workbook-batches/workbook-batch-06.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const FINAL_SENTINEL_DISPOSITION = 'no-trustworthy-exact-name-public-jobs-flow-verified-locally'
const GENERIC_SENTINEL_MODULE_PATH = '../workbookbatch06/failClosedSentinel.js'
const GENERIC_SENTINEL_EXTRACTION_STRATEGY =
  'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified'

test('workbook batch 06 companies all resolve to providers', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(manifest.batch, '06')
  assert.equal(manifest.companies.length, 35)
  assert.equal(report.matchedCount, 35)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('workbook batch 06 providers preserve exact-name coverage while allowing promoted company-local modules', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))
  const promotedProviders = batchProviders.filter(
    (provider) => provider.modulePath !== GENERIC_SENTINEL_MODULE_PATH,
  )

  assert.equal(batchProviders.length, 35)
  assert.ok(promotedProviders.length >= 1)

  for (const provider of batchProviders) {
    const catalogProvider = catalog.find((item) => item.source === provider.source)
    const scraper = scrapersByName.get(provider.source)

    assert.ok(catalogProvider)
    assert.ok(scraper)
    assert.equal(catalogProvider.companyName, provider.companyName)
    assert.equal(catalogProvider.verifiedOn, '2026-07-25')
    assert.equal(catalogProvider.modulePath, provider.modulePath)

    if (provider.modulePath !== GENERIC_SENTINEL_MODULE_PATH) {
      assert.equal(typeof scraper.run, 'function')
      continue
    }

    assert.equal(catalogProvider.verifiedPublicJobCount, 0)
    assert.equal(catalogProvider.verifiedIndiaJobCount, 0)
    assert.equal(catalogProvider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(catalogProvider.verificationDisposition, FINAL_SENTINEL_DISPOSITION)
    assert.equal(catalogProvider.countryFilter, 'India')
    assert.equal(catalogProvider.paginationStrategy, 'none')
    assert.equal(catalogProvider.extractionStrategy, GENERIC_SENTINEL_EXTRACTION_STRATEGY)
    assert.equal(catalogProvider.companyCareerPage, null)
    assert.equal(catalogProvider.companyDomain, null)
    assert.match(
      catalogProvider.verifiedSurfaceSummary,
      new RegExp(`exact-name sentinel for ${provider.companyName}`),
    )
    assert.deepEqual(await scraper.run(), [])
  }
})
