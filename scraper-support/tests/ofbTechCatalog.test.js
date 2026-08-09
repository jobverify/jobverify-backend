import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadOfbTechCatalog = async () => {
  try {
    return await import('../../scraper/ofbtech/catalog.js')
  } catch {
    assert.fail('Expected OFB Tech catalog module at ../../scraper/ofbtech/catalog.js')
  }
}

test('OFB Tech catalog captures the verified first-party homepage and embedded listings metadata', async () => {
  const {
    OFB_TECH_CATALOG,
    default: defaultCatalog,
  } = await loadOfbTechCatalog()

  assert.equal(defaultCatalog, OFB_TECH_CATALOG)
  assert.equal(OFB_TECH_CATALOG.source, 'ofbtech')
  assert.equal(OFB_TECH_CATALOG.companyName, 'OFB Tech')
  assert.equal(OFB_TECH_CATALOG.officialBrandName, 'OFB Tech')
  assert.equal(OFB_TECH_CATALOG.adapter, 'script')
  assert.equal(OFB_TECH_CATALOG.officialHomepageUrl, 'https://www.ofbcareers.com/')
  assert.equal(OFB_TECH_CATALOG.companyCareerPage, 'https://www.ofbcareers.com/')
  assert.equal(
    OFB_TECH_CATALOG.officialListingsPageUrl,
    'https://www.ofbcareers.com/categories',
  )
  assert.equal(
    OFB_TECH_CATALOG.officialJobDetailsBaseUrl,
    'https://www.ofbcareers.com/jobs/',
  )
  assert.equal(OFB_TECH_CATALOG.companyDomain, 'ofbcareers.com')
  assert.equal(OFB_TECH_CATALOG.atsPlatform, 'wix')
  assert.equal(OFB_TECH_CATALOG.countryFilter, 'India')
  assert.equal(
    OFB_TECH_CATALOG.paginationStrategy,
    'single-first-party-wix-listings-page',
  )
  assert.equal(
    OFB_TECH_CATALOG.extractionStrategy,
    'verified-homepage+verified-listings-page+embedded-warmup-json-jobs-collection',
  )
  assert.equal(OFB_TECH_CATALOG.parser, 'custom-script')
  assert.equal(OFB_TECH_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(OFB_TECH_CATALOG.dryRunFile, 'ofbtech/jobs.json')
  assert.equal(OFB_TECH_CATALOG.verifiedOn, '2026-07-17')
  assert.match(OFB_TECH_CATALOG.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(OFB_TECH_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.ofbcareers\.com\//i)
  assert.match(
    OFB_TECH_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.ofbcareers\.com\/categories/i,
  )
  assert.match(
    OFB_TECH_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.ofbcareers\.com\/jobs\/frontend-developer-/i,
  )
  assert.match(OFB_TECH_CATALOG.verifiedSurfaceSummary, /OFB Tech \(OfBusiness\)/i)
  assert.match(OFB_TECH_CATALOG.modulePath, /ofbtech[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'OFB Tech'), false)
})

test('OFB Tech exact backlog row resolves directly from the local provider metadata', async () => {
  const { OFB_TECH_CATALOG } = await loadOfbTechCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'OFB Tech\n',
    catalog: [OFB_TECH_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['OFB Tech', 'ofbtech', 'OFB Tech']],
  )
})

test('getScraperCatalog exposes OFB Tech as a runnable shared provider without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ofbtech')
  const scraper = buildScrapers().find((item) => item.name === 'ofbtech')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'OFB Tech')
  assert.equal(provider.companyCareerPage, 'https://www.ofbcareers.com/')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'OFB Tech'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'OFB Tech\n',
    catalog: getScraperCatalog(),
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['OFB Tech', 'ofbtech', 'OFB Tech']],
  )
})
