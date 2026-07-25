import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadGodrejConsumerProductsCatalog = async () => {
  try {
    return await import('../godrejconsumerproducts/catalog.js')
  } catch {
    assert.fail('Expected Godrej Consumer Products catalog module at ../godrejconsumerproducts/catalog.js')
  }
}

test('Godrej Consumer Products catalog metadata captures the verified first-party careers page and official apply host', async () => {
  const { GODREJ_CONSUMER_PRODUCTS_CATALOG } = await loadGodrejConsumerProductsCatalog()
  const provider = hydrateProviderCatalogEntry(GODREJ_CONSUMER_PRODUCTS_CATALOG)

  assert.equal(provider.source, 'godrejconsumerproducts')
  assert.equal(provider.companyName, 'Godrej Consumer Products')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.godrejcp.com/careers')
  assert.equal(provider.officialCareersPageUrl, 'https://www.godrejcp.com/careers')
  assert.equal(
    provider.officialJoinUsUrl,
    'https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl-',
  )
  assert.equal(
    provider.verifiedSampleJobUrl,
    'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI?utm_source=linkedin&utm_medium=phenom-feeds',
  )
  assert.equal(
    provider.verifiedSampleSecondaryJobUrl,
    'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics?utm_source=linkedin&utm_medium=phenom-feeds',
  )
  assert.equal(provider.officialBrandName, 'Godrej Consumer Products')
  assert.equal(provider.legalEntityName, 'Godrej Consumer Products Limited')
  assert.equal(provider.atsPlatform, 'first-party-careers-page+phenom-apply-links')
  assert.equal(provider.paginationStrategy, 'single-verified-careers-listing-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+public-job-cards+official-phenom-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'godrejcp.com')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.modulePath, /godrejconsumerproducts[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /godrejconsumerproducts[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.godrejcp\.com\/careers/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/careers\.godrejindustries\.com\/in\/en\/godrej-consumer-products-limited-gcpl-/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /Research Scientist HI/i)
  assert.match(provider.verifiedSurfaceSummary, /Manager - Analytics/i)
})

test('Godrej Consumer Products matches exact-name backlog coverage from the local catalog contract alone', async () => {
  const { GODREJ_CONSUMER_PRODUCTS_CATALOG } = await loadGodrejConsumerProductsCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'Godrej Consumer Products\n',
    catalog: [hydrateProviderCatalogEntry(GODREJ_CONSUMER_PRODUCTS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Godrej Consumer Products', 'godrejconsumerproducts', 'Godrej Consumer Products']],
  )
})
