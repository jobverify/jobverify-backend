import assert from 'node:assert/strict'
import test from 'node:test'

import dedicatedProviders from '../providers/providerExtensions/zz-dedicated-scraper-folder-backfill.json' with { type: 'json' }
import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const manifest = {
  batch: '06',
  companies: dedicatedProviders
    .filter((provider) => String(provider.originalModulePath || '').startsWith('../../scraper/workbookbatch06/'))
    .map((provider) => provider.companyName),
}
const FINAL_SENTINEL_DISPOSITION = 'no-trustworthy-exact-name-public-jobs-flow-verified-locally'
const GENERIC_SENTINEL_EXTRACTION_STRATEGY =
  'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified'
const scriptModulePathFor = (source) => `../${source}/script.js`

test('workbook batch 06 companies all resolve to providers', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(manifest.batch, '06')
  assert.equal(manifest.companies.length, 35)
  assert.equal(report.matchedCount, manifest.companies.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('workbook batch 06 providers preserve exact-name coverage while allowing promoted company-local modules', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog,
    aliasMap: getCompanyAliasMap(),
  })
  const batchProviders = report.matched.map(({ source }) => dedicatedProviders.find((provider) => provider.source === source))
  const promotedProviders = batchProviders.filter(
    (provider) => !String(provider.originalModulePath || '').includes('failClosedSentinel.js'),
  )

  assert.equal(batchProviders.length, manifest.companies.length)
  assert.ok(promotedProviders.length >= 1)

  for (const provider of batchProviders) {
    const catalogProvider = catalog.find((item) => item.source === provider.source)
    const scraper = scrapersByName.get(provider.source)

    assert.ok(catalogProvider)
    assert.ok(scraper)
    assert.equal(catalogProvider.companyName, provider.companyName)
    assert.equal(catalogProvider.verifiedOn, provider.verifiedOn)
    assert.equal(catalogProvider.modulePath, scriptModulePathFor(provider.source))

    if (!String(provider.originalModulePath || '').includes('failClosedSentinel.js')) {
      assert.equal(typeof scraper.run, 'function')
      continue
    }

    assert.equal(catalogProvider.verifiedPublicJobCount, 0)
    assert.equal(catalogProvider.verifiedIndiaJobCount, 0)
    assert.equal(catalogProvider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(catalogProvider.originalModulePath, '../../scraper/workbookbatch06/failClosedSentinel.js')
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
