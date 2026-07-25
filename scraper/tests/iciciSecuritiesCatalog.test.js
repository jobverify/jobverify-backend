import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../icicisecurities/catalog.js')
  } catch {
    assert.fail('Expected ICICI Securities catalog module at ../icicisecurities/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../icicisecurities/script.js')
  } catch {
    assert.fail('Expected ICICI Securities scraper module at ../icicisecurities/script.js')
  }
}

test('ICICI Securities local catalog captures the verified first-party current-openings feed', async () => {
  const { ICICI_SECURITIES_CATALOG } = await loadCatalogModule()
  const iciciSecurities = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(ICICI_SECURITIES_CATALOG)

  assert.equal(provider.source, 'icicisecurities')
  assert.equal(provider.companyName, 'ICICI Securities')
  assert.equal(provider.officialBrandName, 'ICICI Securities')
  assert.equal(provider.adapter, 'script')
  assert.equal(
    provider.companyCareerPage,
    'https://www.icicisecurities.com/careers-current-opening',
  )
  assert.equal(provider.listingApiUrl, 'https://www.icicisecurities.com/get-branches')
  assert.equal(provider.companyDomain, 'icicisecurities.com')
  assert.equal(provider.atsPlatform, 'official-company-ajax-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.verifiedRawJobCount, 4)
  assert.equal(provider.verifiedActiveJobCount, 1)
  assert.equal(provider.verifiedActiveSampleTitle, 'Private Wealth Relationship Manager')
  assert.equal(provider.paginationStrategy, 'single-official-page-plus-json-listing-endpoint')
  assert.equal(
    provider.extractionStrategy,
    'verified-current-openings-page+first-party-json-listing-endpoint+closing-date-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.icicisecurities\.com\/careers-current-opening/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.icicisecurities\.com\/get-branches/i)
  assert.match(provider.verifiedSurfaceSummary, /4 public rows/i)
  assert.match(provider.verifiedSurfaceSummary, /1 active opening/i)
  assert.match(provider.verifiedSurfaceSummary, /Private Wealth Relationship Manager/i)
  assert.match(provider.modulePath, /icicisecurities[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /icicisecurities[\\/]jobs\.json$/i)

  assert.equal(iciciSecurities.PROVIDER_METADATA.source, provider.source)
  assert.equal(iciciSecurities.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(iciciSecurities.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(iciciSecurities.PROVIDER_METADATA.listingApiUrl, provider.listingApiUrl)
})

test('ICICI Securities exact backlog row matches from the local provider contract without aliases', async () => {
  const { ICICI_SECURITIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'ICICI Securities\n',
    catalog: [hydrateProviderCatalogEntry(ICICI_SECURITIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ICICI Securities', 'icicisecurities', 'ICICI Securities']],
  )
})

test('getScraperCatalog includes ICICI Securities as a verified first-party JSON careers provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'icicisecurities')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'ICICI Securities')
  assert.equal(provider.companyCareerPage, 'https://www.icicisecurities.com/careers-current-opening')
  assert.equal(provider.companyDomain, 'icicisecurities.com')
  assert.equal(provider.atsPlatform, 'official-company-ajax-careers')
  assert.match(provider.modulePath, /icicisecurities[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable ICICI Securities scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'icicisecurities')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'icicisecurities')
  assert.equal(scraper.provider.atsPlatform, 'official-company-ajax-careers')
  assert.match(scraper.dryRunFile, /icicisecurities[\\/]jobs\.json$/i)
})
