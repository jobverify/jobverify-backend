import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const lgElectronicsIndiaModulePath = path.resolve(currentDir, '../../scraper/lgelectronicsindia/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/lgelectronicsindia/catalog.js')
  } catch {
    assert.fail('Expected LG Electronics India catalog module at ../../scraper/lgelectronicsindia/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/lgelectronicsindia/script.js')
  } catch {
    assert.fail('Expected LG Electronics India scraper module at ../../scraper/lgelectronicsindia/script.js')
  }
}

test('LG Electronics India local catalog captures the verified exact-name no-openings first-party surface without alias churn', async () => {
  const { LG_ELECTRONICS_INDIA_CATALOG } = await loadCatalogModule()
  const lgElectronicsIndia = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(LG_ELECTRONICS_INDIA_CATALOG)

  assert.equal(provider.source, 'lgelectronicsindia')
  assert.equal(provider.companyName, 'LG Electronics India')
  assert.equal(provider.officialBrandName, 'LG Electronics India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://globalcareers.lge.com/locations/IN')
  assert.equal(provider.companyDomain, 'globalcareers.lge.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-lg-global-careers-india-location-page-no-openings',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-lg-global-careers-india-location-page+verified-no-openings-message-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /lgelectronicsindia[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, lgElectronicsIndiaModulePath)
  assert.match(provider.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/globalcareers\.lge\.com\/locations\/IN/i)
  assert.match(provider.verifiedSurfaceSummary, /LG Electronics India/i)
  assert.match(provider.verifiedSurfaceSummary, /There are no open positions at the moment/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'LG Electronics India'), false)

  assert.equal(
    lgElectronicsIndia.PROVIDER_METADATA.source,
    LG_ELECTRONICS_INDIA_CATALOG.source,
  )
  assert.equal(
    lgElectronicsIndia.PROVIDER_METADATA.companyName,
    LG_ELECTRONICS_INDIA_CATALOG.companyName,
  )
  assert.equal(
    lgElectronicsIndia.PROVIDER_METADATA.companyCareerPage,
    LG_ELECTRONICS_INDIA_CATALOG.companyCareerPage,
  )
})

test('LG Electronics India backlog row matches directly from the local catalog without alias churn', async () => {
  const { LG_ELECTRONICS_INDIA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'LG Electronics India\n',
    catalog: [hydrateProviderCatalogEntry(LG_ELECTRONICS_INDIA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['LG Electronics India', 'lgelectronicsindia', 'LG Electronics India']],
  )
})
