import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const bajajAutoScriptModulePath = path.resolve(currentDir, '../../scraper/bajajauto/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/bajajauto/catalog.js')
  } catch {
    assert.fail('Expected Bajaj Auto catalog module at ../../scraper/bajajauto/catalog.js')
  }
}

test('Bajaj Auto catalog captures the verified first-party careers hub, jobs page, APIs, and detail shell urls', async () => {
  const { BAJAJ_AUTO_CATALOG } = await loadCatalogModule()

  assert.equal(BAJAJ_AUTO_CATALOG.source, 'bajajauto')
  assert.equal(BAJAJ_AUTO_CATALOG.companyName, 'Bajaj Auto')
  assert.equal(BAJAJ_AUTO_CATALOG.officialBrandName, 'Bajaj Auto Limited')
  assert.equal(BAJAJ_AUTO_CATALOG.adapter, 'script')
  assert.equal(BAJAJ_AUTO_CATALOG.homepageUrl, 'https://www.bajajauto.com/')
  assert.equal(BAJAJ_AUTO_CATALOG.careersHubUrl, 'https://www.bajajauto.com/careers')
  assert.equal(BAJAJ_AUTO_CATALOG.careersHubFinalUrl, 'https://www.bajajauto.com/careers/why-us')
  assert.equal(BAJAJ_AUTO_CATALOG.companyCareerPage, 'https://www.bajajauto.com/careers/search-result')
  assert.equal(
    BAJAJ_AUTO_CATALOG.careerHeaderScriptUrl,
    'https://cdn.bajajauto.com/js/new-design/js/career-header.js?v=271',
  )
  assert.equal(
    BAJAJ_AUTO_CATALOG.requisitionsApiUrl,
    'https://www.bajajauto.com/handlers/careers/get-requisitions.ashx',
  )
  assert.equal(
    BAJAJ_AUTO_CATALOG.jobTypesApiUrl,
    'https://www.bajajauto.com/handlers/careers/get-job-types.ashx',
  )
  assert.equal(
    BAJAJ_AUTO_CATALOG.sampleDetailUrl,
    'https://www.bajajauto.com/careers/job/mgr/14413',
  )
  assert.equal(BAJAJ_AUTO_CATALOG.companyDomain, 'bajajauto.com')
  assert.equal(BAJAJ_AUTO_CATALOG.atsPlatform, 'first-party-careers-api')
  assert.equal(BAJAJ_AUTO_CATALOG.countryFilter, 'India')
  assert.equal(
    BAJAJ_AUTO_CATALOG.paginationStrategy,
    'single-first-party-requisitions-api-feed',
  )
  assert.equal(
    BAJAJ_AUTO_CATALOG.extractionStrategy,
    'verified-homepage+verified-careers-hub+verified-search-results-page+verified-career-header-bundle+first-party-requisitions-api+verified-detail-shell',
  )
  assert.equal(BAJAJ_AUTO_CATALOG.parser, 'custom-script')
  assert.equal(BAJAJ_AUTO_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(BAJAJ_AUTO_CATALOG.verifiedOn, '2026-07-19')
  assert.equal(BAJAJ_AUTO_CATALOG.dryRunFile, 'bajajauto/jobs.json')
  assert.equal(BAJAJ_AUTO_CATALOG.modulePath, bajajAutoScriptModulePath)
  assert.match(BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary, /July 19, 2026/i)
  assert.match(BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.bajajauto\.com\//i)
  assert.match(BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.bajajauto\.com\/careers\/why-us/i)
  assert.match(
    BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.bajajauto\.com\/careers\/search-result/i,
  )
  assert.match(
    BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary,
    /https:\/\/cdn\.bajajauto\.com\/js\/new-design\/js\/career-header\.js\?v=271/i,
  )
  assert.match(
    BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.bajajauto\.com\/handlers\/careers\/get-requisitions\.ashx/i,
  )
  assert.match(
    BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.bajajauto\.com\/handlers\/careers\/get-job-types\.ashx/i,
  )
  assert.match(
    BAJAJ_AUTO_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.bajajauto\.com\/careers\/job\/mgr\/14413/i,
  )
})

test('buildScrapers and company coverage resolve Bajaj Auto from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajauto')
  const scraper = buildScrapers().find((item) => item.name === 'bajajauto')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Bajaj Auto')
  assert.equal(provider.companyCareerPage, 'https://www.bajajauto.com/careers/search-result')
  assert.match(scraper.dryRunFile, /bajajauto[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Auto\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Auto', 'bajajauto', 'Bajaj Auto']],
  )
})
