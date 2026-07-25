import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../karurvysyabank/catalog.js')
  } catch {
    assert.fail('Expected Karur Vysya Bank catalog module at ../karurvysyabank/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../karurvysyabank/script.js')
  } catch {
    assert.fail('Expected Karur Vysya Bank scraper module at ../karurvysyabank/script.js')
  }
}

test('Karur Vysya Bank local catalog captures the verified first-party Zwayam careers surface', async () => {
  const { KARUR_VYSYA_BANK_CATALOG } = await loadCatalogModule()
  const karurVysyaBank = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(KARUR_VYSYA_BANK_CATALOG)

  assert.equal(provider.source, 'karurvysyabank')
  assert.equal(provider.companyName, 'Karur Vysya Bank')
  assert.equal(provider.officialBrandName, 'Karur Vysya Bank')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.modulePath, '../karurvysyabank/script.js')
  assert.match(provider.dryRunFile, /karurvysyabank[\\/]jobs\.json$/i)
  assert.equal(provider.homepageUrl, 'https://www.kvb.bank.in/')
  assert.equal(provider.careersLandingUrl, 'https://careers.karurvysya.bank.in/karurvysyabank/')
  assert.equal(
    provider.companyCareerPage,
    'https://careers.karurvysya.bank.in/karurvysyabank/jobslist',
  )
  assert.equal(provider.companyDomain, 'careers.karurvysya.bank.in')
  assert.equal(
    provider.zwayamCompanyConfigurationUrl,
    'https://public.zwayam.com/data-service/v2/company/15551/careersite-configurations',
  )
  assert.equal(
    provider.zwayamSearchApiUrl,
    'https://public.zwayam.com/manageESQueries/searchJob',
  )
  assert.equal(provider.zwayamCompanyId, 'MTU1NTE=')
  assert.equal(provider.zwayamDetailCompanyId, '15551')
  assert.equal(
    provider.verifiedSampleJobUrl,
    'https://careers.karurvysya.bank.in/karurvysyabank/jobview/bus-dev-executive-bc-chennai-tamil-nadu-india-2025071615352836',
  )
  assert.equal(provider.atsPlatform, 'zwayam')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'public-zwayam-manageesqueries-searchjob')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-homepage+verified-first-party-zwayam-careers-shell+verified-public-zwayam-company-config+public-zwayam-manageesqueries-searchjob',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.kvb\.bank\.in\//i)
  assert.match(provider.verifiedSurfaceSummary, /careers\.karurvysya\.bank\.in\/karurvysyabank\/jobslist/i)
  assert.match(provider.verifiedSurfaceSummary, /public\.zwayam\.com\/data-service\/v2\/company\/15551\/careersite-configurations/i)
  assert.match(provider.verifiedSurfaceSummary, /public\.zwayam\.com\/manageESQueries\/searchJob/i)
  assert.match(provider.verifiedSurfaceSummary, /bus-dev-executive-bc-chennai-tamil-nadu-india-2025071615352836/i)

  assert.equal(karurVysyaBank.PROVIDER_METADATA.source, provider.source)
  assert.equal(karurVysyaBank.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(karurVysyaBank.CAREERS_URL, provider.companyCareerPage)
})

test('Karur Vysya Bank exact-name backlog row resolves directly from the local provider contract without aliases', async () => {
  const { KARUR_VYSYA_BANK_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Karur Vysya Bank\n',
    catalog: [hydrateProviderCatalogEntry(KARUR_VYSYA_BANK_CATALOG)],
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Karur Vysya Bank', 'karurvysyabank', 'Karur Vysya Bank']],
  )
})
