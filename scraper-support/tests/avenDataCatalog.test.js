import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const avenDataModulePath = path.resolve(currentDir, '../../scraper/avendata/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/avendata/catalog.js')
  } catch {
    assert.fail('Expected AvenDATA catalog module at ../../scraper/avendata/catalog.js')
  }
}

const loadAvenDataModule = async () => {
  try {
    return await import('../../scraper/avendata/script.js')
  } catch {
    assert.fail('Expected AvenDATA scraper module at ../../scraper/avendata/script.js')
  }
}

test('AvenDATA local catalog captures the verified first-party resume-form careers surface without public listings', async () => {
  const { AVENDATA_CATALOG } = await loadCatalogModule()
  const avenData = await loadAvenDataModule()

  assert.equal(AVENDATA_CATALOG.source, 'avendata')
  assert.equal(AVENDATA_CATALOG.companyName, 'AvenDATA')
  assert.equal(AVENDATA_CATALOG.officialBrandName, 'AvenDATA')
  assert.equal(AVENDATA_CATALOG.adapter, 'script')
  assert.equal(AVENDATA_CATALOG.companyCareerPage, 'https://avendata.com/careers')
  assert.equal(AVENDATA_CATALOG.homepageUrl, 'https://avendata.com/')
  assert.equal(AVENDATA_CATALOG.careersPageUrl, 'https://avendata.com/careers')
  assert.equal(AVENDATA_CATALOG.robotsTxtUrl, 'https://avendata.com/robots.txt')
  assert.equal(AVENDATA_CATALOG.sitemapUrl, 'https://avendata.com/sitemap.xml')
  assert.deepEqual(AVENDATA_CATALOG.sitemapCareerRouteUrls, ['https://avendata.com/careers'])
  assert.deepEqual(AVENDATA_CATALOG.careerAliasRouteUrls, [
    'https://avendata.com/careers/',
    'https://www.avendata.com/careers',
  ])
  assert.deepEqual(AVENDATA_CATALOG.noPublicJobRouteUrls, [
    'https://avendata.com/career',
    'https://avendata.com/jobs',
    'https://avendata.com/join-us',
    'https://avendata.com/work-with-us',
    'https://avendata.com/openings',
    'https://avendata.com/current-openings',
    'https://avendata.com/company/careers',
    'https://avendata.com/about/careers',
  ])
  assert.equal(AVENDATA_CATALOG.atsPlatform, 'official-company-careers-nonlisting')
  assert.equal(AVENDATA_CATALOG.countryFilter, 'India')
  assert.equal(
    AVENDATA_CATALOG.paginationStrategy,
    'homepage-plus-careers-page-plus-robots-sitemap-and-adjacent-route-validation',
  )
  assert.equal(
    AVENDATA_CATALOG.extractionStrategy,
    'verified-homepage+verified-careers-resume-form+verified-robots-txt+verified-single-sitemap-careers-route+missing-adjacent-jobs-routes-return-empty',
  )
  assert.equal(AVENDATA_CATALOG.parser, 'custom-script')
  assert.equal(AVENDATA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(AVENDATA_CATALOG.companyDomain, 'avendata.com')
  assert.equal(AVENDATA_CATALOG.verifiedOn, '2026-10-03')
  assert.match(AVENDATA_CATALOG.verifiedSurfaceSummary, /https:\/\/avendata\.com\//i)
  assert.match(AVENDATA_CATALOG.verifiedSurfaceSummary, /https:\/\/avendata\.com\/careers/i)
  assert.match(AVENDATA_CATALOG.verifiedSurfaceSummary, /Upload Your Resume/i)
  assert.match(AVENDATA_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(AVENDATA_CATALOG.modulePath, avenDataModulePath)

  assert.equal(avenData.PROVIDER_METADATA.source, AVENDATA_CATALOG.source)
  assert.equal(avenData.PROVIDER_METADATA.companyName, AVENDATA_CATALOG.companyName)
  assert.equal(avenData.PROVIDER_METADATA.companyCareerPage, AVENDATA_CATALOG.companyCareerPage)
  assert.equal(avenData.PROVIDER_METADATA.sitemapUrl, AVENDATA_CATALOG.sitemapUrl)
})

test('AvenDATA coverage resolves the backlog company name without requiring an alias entry', async () => {
  const { AVENDATA_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'AvenDATA\n',
    catalog: [AVENDATA_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AvenDATA', 'avendata', 'AvenDATA']],
  )
})

test('buildScrapers and company coverage resolve AvenDATA from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'avendata')
  const scraper = buildScrapers().find((item) => item.name === 'avendata')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'AvenDATA')
  assert.equal(provider.companyCareerPage, 'https://avendata.com/careers')
  assert.match(scraper.dryRunFile, /avendata[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'AvenDATA\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AvenDATA', 'avendata', 'AvenDATA']],
  )
})
