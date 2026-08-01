import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadIhclCatalogModule = async () => {
  try {
    return await import('../../scraper/ihcl/catalog.js')
  } catch {
    assert.fail('Expected IHCL catalog module at ../../scraper/ihcl/catalog.js')
  }
}

test('IHCL catalog captures the verified public SuccessFactors board from July 16, 2026', async () => {
  const { IHCL_CATALOG } = await loadIhclCatalogModule()
  const provider = hydrateProviderCatalogEntry(IHCL_CATALOG)

  assert.equal(provider.source, 'ihcl')
  assert.equal(provider.companyName, 'IHCL')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q=')
  assert.equal(provider.companyDomain, 'careers.ihcltata.com')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'startrow-query')
  assert.equal(provider.extractionStrategy, 'successfactors-search-page+detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.modulePath, /ihcl[\\/]script\.js$/i)
  assert.match(provider.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.ihcltata\.com\/IHCL\/search\/\?createNewAlert=false&q=/i)
  assert.match(provider.verifiedSurfaceSummary, /431 Jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Housekeeping Executive/i)
  assert.match(provider.verifiedSurfaceSummary, /Duty Manager/i)
})

test('IHCL backlog row matches directly from the local catalog metadata without alias churn', async () => {
  const { IHCL_CATALOG } = await loadIhclCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'IHCL\n',
    catalog: [hydrateProviderCatalogEntry(IHCL_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['IHCL', 'ihcl', 'IHCL']],
  )
})

test('getScraperCatalog includes IHCL as a verified public SuccessFactors provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ihcl')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'IHCL')
  assert.equal(provider.companyCareerPage, 'https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q=')
  assert.equal(provider.companyDomain, 'careers.ihcltata.com')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.match(provider.modulePath, /ihcl[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable IHCL scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'ihcl')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'ihcl')
  assert.equal(scraper.provider.atsPlatform, 'successfactors')
  assert.match(scraper.dryRunFile, /ihcl[\\/]jobs\.json$/i)
})
