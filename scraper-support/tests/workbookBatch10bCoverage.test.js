import assert from 'node:assert/strict'
import test from 'node:test'

import batchProviders from '../providers/providerExtensions/workbook-batch-10-b.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import { getScraperSourceDirectoryName } from '../providers/sourcePaths.js'
import { classifyProviderImplementation } from '../../scripts/reportScriptCatalogTopology.js'

const EXPECTED_COMPANY_COUNT = 56
const EXPECTED_BATCH_ID = '10b'
const EXPECTED_BATCH_LABEL = '10'
const EXPECTED_EXTRACTION_STRATEGY =
  'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified'
const EXPECTED_CSV = ['company_name', ...batchProviders.map((provider) => provider.companyName)].join('\n').concat('\n')

test('workbook batch 10b providers resolve through the shared catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: EXPECTED_CSV,
    catalog: getScraperCatalog(),
  })

  assert.equal(EXPECTED_BATCH_ID, '10b')
  assert.equal(EXPECTED_BATCH_LABEL, '10')
  assert.equal(batchProviders.length, EXPECTED_COMPANY_COUNT)
  assert.equal(report.matchedCount, EXPECTED_COMPANY_COUNT)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.deepEqual(
    report.matched.map((entry) => entry.companyName),
    batchProviders.map((provider) => provider.companyName),
  )
})

test('workbook batch 10b retains historical registration and executes only remaining empty implementations', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))

  for (const provider of batchProviders) {
    const catalogProvider = catalog.find((entry) => entry.source === provider.source)
    const scraper = scrapersByName.get(provider.source)
    assert.ok(catalogProvider)
    assert.ok(scraper)
    assert.equal(catalogProvider.source, provider.source)
    assert.equal(scraper.name, provider.source)
    const implementation = classifyProviderImplementation(catalogProvider)
    // Some registration records have already been updated alongside a repair.
    // Keep their exact source/name binding without imposing sentinel metadata.
    if (provider.atsPlatform !== 'workbook-exact-name-sentinel') {
      assert.equal(catalogProvider.companyName, provider.companyName)
      assert.ok(['script', 'shared-adapter', 'discovery-only'].includes(implementation.type), provider.source)
      assert.equal(typeof scraper.run, 'function')
      continue
    }
    const expectedDirectoryName = getScraperSourceDirectoryName(provider)
    const expectedModulePath = `../${expectedDirectoryName}/script.js`
    const expectedDryRunFile = `${expectedDirectoryName}/jobs.json`
    const expectedOriginalModulePath = `../workbookbatch10b/failClosedSentinel.js`

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
    assert.equal(provider.verifiedOn, '2026-08-08')
    assert.equal(provider.verifiedPublicJobCount, 0)
    assert.equal(provider.verifiedIndiaJobCount, 0)
    assert.equal(provider.originalModulePath, expectedOriginalModulePath)
    assert.equal(provider.backfillMode ?? null, 'workday')
    assert.equal(
      provider.verificationDisposition,
      'no-trustworthy-exact-name-public-jobs-flow-verified-locally',
    )
    assert.equal(
      provider.verifiedSurfaceSummary.includes('Workbook batch 10 exact-name sentinel'),
      true,
    )
    assert.equal(
      provider.verifiedSurfaceSummary.includes('Saturday, August 8, 2026'),
      true,
    )
    assert.equal(provider.verifiedSurfaceSummary.includes(provider.companyName), true)
    // Historical registration remains testable after a source is repaired.
    // The native fixture contracts cover implemented scrapers without live
    // requests or a requirement to keep returning an empty inventory.
    if (['sentinel', 'static-empty'].includes(implementation.type)) {
      assert.equal(String(catalogProvider.modulePath).replaceAll('\\', '/').endsWith(`/scraper/${expectedDirectoryName}/script.js`), true, provider.source)
      assert.deepEqual(await scraper.run(), [])
    } else {
      assert.ok(['script', 'shared-adapter', 'discovery-only'].includes(implementation.type), provider.source)
      assert.equal(typeof scraper.run, 'function')
    }
  }
})
