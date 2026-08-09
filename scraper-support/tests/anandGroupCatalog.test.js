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
    return await import('../../scraper/anandgroup/catalog.js')
  } catch {
    assert.fail('Expected Anand Group catalog module at ../../scraper/anandgroup/catalog.js')
  }
}

test('Anand Group local catalog captures the verified first-party careers subsection and no-public-jobs surface', async () => {
  const { ANAND_GROUP_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ANAND_GROUP_CATALOG)

  assert.equal(provider.source, 'anandgroup')
  assert.equal(provider.companyName, 'Anand Group')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.anandgroupindia.com/careers-at-anand/')
  assert.equal(provider.joinUsPageUrl, 'https://www.anandgroupindia.com/careers-at-anand/join-usnew/')
  assert.equal(
    provider.shopfloorPageUrl,
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  )
  assert.equal(provider.homepageUrl, 'https://www.anandgroupindia.com/')
  assert.equal(provider.robotsTxtUrl, 'https://www.anandgroupindia.com/robots.txt')
  assert.equal(provider.sitemapIndexUrl, 'https://www.anandgroupindia.com/sitemap_index.xml')
  assert.equal(provider.pageSitemapUrl, 'https://www.anandgroupindia.com/page-sitemap.xml')
  assert.equal(provider.companyDomain, 'anandgroupindia.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-homepage-handoff-plus-careers-subsection-plus-page-sitemap-plus-missing-common-job-routes',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-careers-handoff+verified-careers-and-join-us-pages-without-public-listings+verified-page-sitemap-careers-urls+verified-missing-common-job-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.deepEqual(provider.expectedCareerUrlsFromPageSitemap, [
    'https://www.anandgroupindia.com/careers-at-anand/',
    'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  ])
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.modulePath, /anandgroup[\\/]script\.js$/i)
  assert.match(provider.verifiedSurfaceSummary, /July 15, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.anandgroupindia\.com\/careers-at-anand\//i)
  assert.match(provider.verifiedSurfaceSummary, /join-usnew/i)
  assert.match(provider.verifiedSurfaceSummary, /page-sitemap\.xml/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Anand Group'), false)
})

test('Anand Group backlog row matches directly from the local provider metadata without aliases', async () => {
  const { ANAND_GROUP_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Anand Group\n',
    catalog: [hydrateProviderCatalogEntry(ANAND_GROUP_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Anand Group', 'anandgroup', 'Anand Group']],
  )
})

test('buildScrapers and company coverage resolve Anand Group from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'anandgroup')
  const scraper = buildScrapers().find((item) => item.name === 'anandgroup')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Anand Group')
  assert.equal(provider.companyCareerPage, 'https://www.anandgroupindia.com/careers-at-anand/')
  assert.match(scraper.dryRunFile, /anandgroup[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Anand Group\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Anand Group', 'anandgroup', 'Anand Group']],
  )
})
