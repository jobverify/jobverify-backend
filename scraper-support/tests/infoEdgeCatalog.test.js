import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/infoedge/catalog.js')
  } catch {
    assert.fail('Expected InfoEdge catalog module at ../../scraper/infoedge/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/infoedge/script.js')
  } catch {
    assert.fail('Expected InfoEdge scraper module at ../../scraper/infoedge/script.js')
  }
}

test('InfoEdge local catalog captures the verified first-party careers page and Zwayam contracts', async () => {
  const { INFOEDGE_CATALOG } = await loadCatalogModule()
  const infoEdge = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(INFOEDGE_CATALOG)

  assert.equal(INFOEDGE_CATALOG.source, 'infoedge')
  assert.equal(INFOEDGE_CATALOG.companyName, 'InfoEdge')
  assert.equal(INFOEDGE_CATALOG.officialBrandName, 'Info Edge India Ltd')
  assert.equal(INFOEDGE_CATALOG.adapter, 'script')
  assert.equal(INFOEDGE_CATALOG.homepageUrl, 'https://www.infoedgeindia.com/')
  assert.equal(INFOEDGE_CATALOG.companyCareerPage, 'https://careers.infoedge.com/infoedge/jobslist')
  assert.equal(INFOEDGE_CATALOG.companyDomain, 'careers.infoedge.com')
  assert.equal(INFOEDGE_CATALOG.careersLandingUrl, 'https://careers.infoedge.com/infoedge/')
  assert.equal(INFOEDGE_CATALOG.zwayamTenantGroupId, 'G1')
  assert.equal(INFOEDGE_CATALOG.zwayamCompanyId, 'MTU1Nzg=')
  assert.equal(INFOEDGE_CATALOG.zwayamDetailCompanyId, '15578')
  assert.equal(INFOEDGE_CATALOG.verifiedPublicJobCount, 303)
  assert.equal(
    INFOEDGE_CATALOG.verifiedSampleJobUrl,
    'https://careers.infoedge.com/infoedge/jobview/lead-ui-designer-noida-2026071413401714',
  )
  assert.equal(INFOEDGE_CATALOG.atsPlatform, 'zwayam')
  assert.equal(INFOEDGE_CATALOG.countryFilter, 'India')
  assert.equal(
    INFOEDGE_CATALOG.paginationStrategy,
    'public-zwayam-total-count-plus-page-size',
  )
  assert.equal(
    INFOEDGE_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+public-zwayam-search-api+detail-api',
  )
  assert.equal(INFOEDGE_CATALOG.parser, 'custom-script')
  assert.equal(INFOEDGE_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INFOEDGE_CATALOG.modulePath, '../infoedge/script.js')
  assert.equal(INFOEDGE_CATALOG.dryRunFile, 'infoedge/jobs.json')
  assert.equal(INFOEDGE_CATALOG.verifiedOn, '2026-07-16')
  assert.match(INFOEDGE_CATALOG.verifiedSurfaceSummary, /careers\.infoedge\.com\/infoedge\/jobslist/i)
  assert.match(INFOEDGE_CATALOG.verifiedSurfaceSummary, /public\.zwayam\.com\/jobs\/search/i)
  assert.match(INFOEDGE_CATALOG.verifiedSurfaceSummary, /public\.zwayam\.com\/jobs-service\/v1\/jobs\/careersite/i)
  assert.match(INFOEDGE_CATALOG.verifiedSurfaceSummary, /303 live jobs/i)

  assert.equal(provider.source, 'infoedge')
  assert.equal(provider.companyName, 'InfoEdge')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.infoedge.com/infoedge/jobslist')
  assert.equal(provider.companyDomain, 'careers.infoedge.com')
  assert.match(provider.modulePath, /infoedge[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /infoedge[\\/]jobs\.json$/i)

  assert.equal(infoEdge.PROVIDER_METADATA.source, provider.source)
  assert.equal(infoEdge.CAREERS_URL, provider.companyCareerPage)
  assert.equal(infoEdge.CAREERS_LANDING_URL, provider.careersLandingUrl)
  assert.equal(infoEdge.LISTING_API_URL, 'https://public.zwayam.com/jobs/search')
  assert.equal(infoEdge.DETAIL_API_URL, 'https://public.zwayam.com/jobs-service/v1/jobs/careersite')
})

test('InfoEdge exact-name backlog rows resolve directly from local provider metadata without shared aliases', async () => {
  const { INFOEDGE_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'InfoEdge\n',
    catalog: [hydrateProviderCatalogEntry(INFOEDGE_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['InfoEdge', 'infoedge', 'InfoEdge']],
  )
})

test('getScraperCatalog includes InfoEdge as a verified Zwayam provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'infoedge')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'InfoEdge')
  assert.equal(provider.companyCareerPage, 'https://careers.infoedge.com/infoedge/jobslist')
  assert.equal(provider.companyDomain, 'careers.infoedge.com')
  assert.equal(provider.atsPlatform, 'zwayam')
  assert.match(provider.modulePath, /infoedge[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable InfoEdge scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'infoedge')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'infoedge')
  assert.equal(scraper.provider.atsPlatform, 'zwayam')
  assert.match(scraper.dryRunFile, /infoedge[\\/]jobs\.json$/i)
})
