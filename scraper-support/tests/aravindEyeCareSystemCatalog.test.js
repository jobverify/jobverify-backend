import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/aravindeyecaresystem/catalog.js')
  } catch {
    assert.fail('Expected Aravind Eye Care System catalog module at ../../scraper/aravindeyecaresystem/catalog.js')
  }
}

test('Aravind Eye Care System local catalog captures the verified first-party careers surface without aliases', async () => {
  const { ARAVIND_EYE_CARE_SYSTEM_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ARAVIND_EYE_CARE_SYSTEM_CATALOG)

  assert.equal(provider.source, 'aravindeyecaresystem')
  assert.equal(provider.companyName, 'Aravind Eye Care System')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://aravind.org/careers/')
  assert.equal(provider.homepageUrl, 'https://aravind.org/')
  assert.equal(provider.pageSitemapUrl, 'https://aravind.org/wp-sitemap.xml')
  assert.equal(provider.jobListingsAjaxUrl, 'https://aravind.org/jm-ajax/get_listings/')
  assert.equal(provider.jobListingsApiUrl, 'https://aravind.org/wp-json/wp/v2/job-listings')
  assert.equal(provider.companyDomain, 'aravind.org')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-homepage-plus-careers-page-plus-wp-job-manager-first-party-feeds',
  )
  assert.equal(
    provider.extractionStrategy,
    'official-homepage+official-careers-page+page-sitemap+wp-job-manager-ajax-feed+wp-rest-job-listings',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-09-03')
  assert.match(provider.modulePath, /aravindeyecaresystem[\\/]script\.js$/i)
  assert.match(provider.verifiedSurfaceSummary, /September 3, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/aravind\.org\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/aravind\.org\/wp-sitemap\.xml/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/aravind\.org\/jm-ajax\/get_listings\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/aravind\.org\/wp-json\/wp\/v2\/job-listings/i)
  assert.match(provider.verifiedSurfaceSummary, /return no live listings/i)
  assert.match(provider.verifiedSurfaceSummary, /zero open roles/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Aravind Eye Care System'), false)
})

test('Aravind Eye Care System backlog row matches directly from the local provider metadata without alias churn', async () => {
  const { ARAVIND_EYE_CARE_SYSTEM_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Aravind Eye Care System\n',
    catalog: [hydrateProviderCatalogEntry(ARAVIND_EYE_CARE_SYSTEM_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aravind Eye Care System', 'aravindeyecaresystem', 'Aravind Eye Care System']],
  )
})

test('buildScrapers and company coverage resolve Aravind Eye Care System from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'aravindeyecaresystem')
  const scraper = buildScrapers().find((item) => item.name === 'aravindeyecaresystem')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Aravind Eye Care System')
  assert.equal(provider.companyCareerPage, 'https://aravind.org/careers/')
  assert.match(scraper.dryRunFile, /aravindeyecaresystem[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Aravind Eye Care System\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aravind Eye Care System', 'aravindeyecaresystem', 'Aravind Eye Care System']],
  )
})
