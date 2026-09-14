import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/cbnits/catalog.js')
  } catch {
    assert.fail('Expected CBNITS catalog module at ../../scraper/cbnits/catalog.js')
  }
}

test('CBNITS catalog captures the verified first-party SPA careers shell contract', async () => {
  const { CBNITS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(CBNITS_CATALOG)

  assert.equal(defaultCatalog, CBNITS_CATALOG)
  assert.equal(provider.source, 'cbnits')
  assert.equal(provider.companyName, 'CBNITS')
  assert.equal(provider.officialBrandName, 'CBNITS')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.cbnits.com/')
  assert.equal(provider.companyCareerPage, 'https://cbnits.com/')
  assert.equal(provider.atsPlatform, 'first-party-spa-careers-shell-no-public-jobs-html')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-spa-shell-and-careers-bundle-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-spa-shell+current-careers-route-bundle-without-rendered-jobs',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'cbnits.com')
  assert.equal(provider.verifiedOn, '2026-09-13')
  assert.match(provider.modulePath, /cbnits[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /cbnits[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Sunday, September 13, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/cbnits\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /Agentic AI, Cybersecurity & Intelligent Enterprise Solutions \| CBNITS/i)
  assert.match(provider.verifiedSurfaceSummary, /div id="root"/i)
})

test('CBNITS exact backlog row resolves from the local catalog contract', async () => {
  const { CBNITS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'CBNITS\n',
    catalog: [hydrateProviderCatalogEntry(CBNITS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['CBNITS', 'cbnits', 'CBNITS']],
  )
})
