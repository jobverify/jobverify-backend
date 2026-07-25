import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dishTvModulePath = path.resolve(currentDir, '../dishtv/script.js')

const loadDishTvCatalog = async () => {
  try {
    return await import('../dishtv/catalog.js')
  } catch {
    assert.fail('Expected DishTV catalog module at ../dishtv/catalog.js')
  }
}

const loadDishTvModule = async () => {
  try {
    return await import('../dishtv/script.js')
  } catch {
    assert.fail('Expected DishTV scraper module at ../dishtv/script.js')
  }
}

test('DishTV local catalog captures the verified first-party homepage, sitemap, and current-openings careers page', async () => {
  const { DISH_TV_CATALOG } = await loadDishTvCatalog()
  const dishTv = await loadDishTvModule()

  assert.equal(DISH_TV_CATALOG.source, 'dishtv')
  assert.equal(DISH_TV_CATALOG.companyName, 'DishTV')
  assert.equal(DISH_TV_CATALOG.officialBrandName, 'DishTV')
  assert.equal(DISH_TV_CATALOG.adapter, 'script')
  assert.equal(DISH_TV_CATALOG.homepageUrl, 'https://www.dishtv.in/')
  assert.equal(DISH_TV_CATALOG.careersPageUrl, 'https://www.dishtv.in/careers.html')
  assert.equal(DISH_TV_CATALOG.companyCareerPage, 'https://www.dishtv.in/careers.html')
  assert.equal(DISH_TV_CATALOG.sitemapUrl, 'https://www.dishtv.in/sitemap.xml')
  assert.equal(DISH_TV_CATALOG.jobsContactEmail, 'jobs@dishd2h.com')
  assert.equal(DISH_TV_CATALOG.sampleApplyUrl, 'https://forms.office.com/r/57DD6f1beK')
  assert.equal(DISH_TV_CATALOG.companyDomain, 'dishtv.in')
  assert.equal(DISH_TV_CATALOG.atsPlatform, 'official-company-careers-inline-job-cards')
  assert.equal(DISH_TV_CATALOG.countryFilter, 'India')
  assert.equal(
    DISH_TV_CATALOG.paginationStrategy,
    'single-first-party-careers-page-inline-job-cards',
  )
  assert.equal(
    DISH_TV_CATALOG.extractionStrategy,
    'verified-homepage-footer-careers-link+verified-sitemap-careers-entry+verified-first-party-current-openings-cards+trusted-external-apply-forms',
  )
  assert.equal(DISH_TV_CATALOG.parser, 'custom-script')
  assert.equal(DISH_TV_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DISH_TV_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(DISH_TV_CATALOG.dryRunFile, 'dishtv/jobs.json')
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dishtv\.in\//i)
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dishtv\.in\/careers\.html/i)
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dishtv\.in\/sitemap\.xml/i)
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /13 public job cards/i)
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /jobs@dishd2h\.com/i)
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /forms\.office\.com\/r\/57DD6f1beK/i)
  assert.match(DISH_TV_CATALOG.verifiedSurfaceSummary, /Google Forms/i)
  assert.equal(DISH_TV_CATALOG.modulePath, dishTvModulePath)

  assert.equal(dishTv.PROVIDER_METADATA.source, DISH_TV_CATALOG.source)
  assert.equal(dishTv.PROVIDER_METADATA.companyName, DISH_TV_CATALOG.companyName)
  assert.equal(dishTv.PROVIDER_METADATA.careersPageUrl, DISH_TV_CATALOG.careersPageUrl)
  assert.equal(dishTv.PROVIDER_METADATA.sitemapUrl, DISH_TV_CATALOG.sitemapUrl)
})

test('DishTV backlog row hydrates locally without requiring a shared alias entry', async () => {
  const { DISH_TV_CATALOG } = await loadDishTvCatalog()
  const provider = hydrateProviderCatalogEntry(DISH_TV_CATALOG)

  assert.equal(provider.companyName, 'DishTV')
  assert.equal(provider.companyDomain, 'dishtv.in')
  assert.match(provider.modulePath, /dishtv[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /dishtv[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'DishTV'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'DishTV\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DishTV', 'dishtv', 'DishTV']],
  )
})

test('buildScrapers and company coverage resolve DishTV from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dishtv')
  const scraper = buildScrapers().find((item) => item.name === 'dishtv')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'DishTV')
  assert.equal(provider.companyCareerPage, 'https://www.dishtv.in/careers.html')
  assert.match(scraper.dryRunFile, /dishtv[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'DishTV\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DishTV', 'dishtv', 'DishTV']],
  )
})
