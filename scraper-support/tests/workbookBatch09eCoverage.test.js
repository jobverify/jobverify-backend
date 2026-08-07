import assert from 'node:assert/strict'
import test from 'node:test'

import batchProviders from '../providers/providerExtensions/workbook-batch-09-e.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import { getScraperSourceDirectoryName } from '../providers/sourcePaths.js'

const EXPECTED_COMPANY_COUNT = 68
const EXPECTED_BATCH_ID = "09e"
const EXPECTED_BATCH_LABEL = "09"
const EXPECTED_EXTRACTION_STRATEGY =
  'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified'
const EXPECTED_CSV = ['company_name', ...batchProviders.map((provider) => provider.companyName)].join('\n').concat('\n')

test('workbook batch 09e providers resolve through the shared catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: EXPECTED_CSV,
    catalog: getScraperCatalog(),
  })

  assert.equal(EXPECTED_BATCH_ID, "09e")
  assert.equal(EXPECTED_BATCH_LABEL, "09")
  assert.equal(batchProviders.length, EXPECTED_COMPANY_COUNT)
  assert.equal(report.matchedCount, EXPECTED_COMPANY_COUNT)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.deepEqual(
    report.matched.map((entry) => entry.companyName),
    batchProviders.map((provider) => provider.companyName),
  )
})

test('workbook batch 09e providers stay exact-name and fail closed', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))

  for (const provider of batchProviders) {
    const catalogProvider = catalog.find((entry) => entry.source === provider.source)
    const scraper = scrapersByName.get(provider.source)
    const expectedDirectoryName = getScraperSourceDirectoryName(provider)
    const expectedModulePath = `../${expectedDirectoryName}/script.js`
    const expectedDryRunFile = `${expectedDirectoryName}/jobs.json`
    const expectedRuntimeSuffix = `scraper\\${expectedDirectoryName}\\script.js`
    const expectedOriginalModulePath = `../workbookbatch09e/failClosedSentinel.js`

    assert.ok(catalogProvider)
    assert.ok(scraper)
    assert.equal(provider.modulePath, expectedModulePath)
    assert.equal(provider.dryRunFile, expectedDryRunFile)
    assert.equal(provider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(provider.countryFilter, 'India')
    assert.equal(provider.paginationStrategy, 'none')
    assert.equal(provider.extractionStrategy, EXPECTED_EXTRACTION_STRATEGY)
    assert.equal(provider.parser, 'custom-script')
    assert.equal(provider.normalizationProfile, 'engineering-default')
    assert.equal(provider.verifiedOn, "2026-08-01")
    assert.equal(provider.verifiedPublicJobCount, 0)
    assert.equal(provider.verifiedIndiaJobCount, 0)
    assert.equal(provider.originalModulePath, expectedOriginalModulePath)
    assert.equal(provider.backfillMode ?? null, "workday")
    assert.equal(
      provider.verificationDisposition,
      'no-trustworthy-exact-name-public-jobs-flow-verified-locally',
    )
    assert.equal(
      provider.verifiedSurfaceSummary.includes("Workbook batch 09 exact-name sentinel"),
      true,
    )
    assert.equal(
      provider.verifiedSurfaceSummary.includes("Saturday, August 1, 2026"),
      true,
    )
    assert.equal(provider.verifiedSurfaceSummary.includes(provider.companyName), true)
    assert.equal(String(catalogProvider.modulePath).endsWith(expectedRuntimeSuffix), true)
    assert.deepEqual(await scraper.run(), [])
  }
})
