import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadSolarIndustriesIndiaCatalog = async () => {
  try {
    return await import('../solarindustriesindia/catalog.js')
  } catch {
    assert.fail('Expected Solar Industries India catalog module at ../solarindustriesindia/catalog.js')
  }
}

test('Solar Industries India catalog metadata captures the verified homepage careers handoff and blocked careers board state', async () => {
  const { SOLAR_INDUSTRIES_INDIA_CATALOG } = await loadSolarIndustriesIndiaCatalog()
  const provider = hydrateProviderCatalogEntry(SOLAR_INDUSTRIES_INDIA_CATALOG)

  assert.equal(provider.source, 'solarindustriesindia')
  assert.equal(provider.companyName, 'Solar Industries India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.solargroup.com/solargroup/')
  assert.equal(provider.officialHomepageUrl, 'https://www.solargroup.com/')
  assert.equal(provider.officialBrandName, 'Solar Group')
  assert.equal(provider.legalEntityName, 'Solar Industries India Limited')
  assert.equal(
    provider.sampleJobViewUrl,
    'https://careers.solargroup.com/solargroup/jobview/sr-executive-uav-2024122016373073',
  )
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-homepage-careers-nav-plus-blocked-or-timeout-careers-board-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-careers-handoff+verified-board-and-jobview-routes+verified-blocked-or-timeout-direct-fetches-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'solargroup.com')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.modulePath, /solarindustriesindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /solarindustriesindia[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.solargroup\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.solargroup\.com\/solargroup\//i)
  assert.match(provider.verifiedSurfaceSummary, /403 Forbidden|timed out/i)
})

test('Solar Industries India matches exact-name backlog coverage from the local catalog contract alone', async () => {
  const { SOLAR_INDUSTRIES_INDIA_CATALOG } = await loadSolarIndustriesIndiaCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'Solar Industries India\n',
    catalog: [hydrateProviderCatalogEntry(SOLAR_INDUSTRIES_INDIA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Solar Industries India', 'solarindustriesindia', 'Solar Industries India']],
  )
})
