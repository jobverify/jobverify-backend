import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const ofBusinessModulePath = path.resolve(currentDir, '../../scraper/ofbusiness/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/ofbusiness/catalog.js')
  } catch {
    assert.fail('Expected OfBusiness catalog module at ../../scraper/ofbusiness/catalog.js')
  }
}

test('OfBusiness local catalog captures the verified first-party paginated careers surface', async () => {
  const {
    OF_BUSINESS_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(OF_BUSINESS_CATALOG)

  assert.equal(defaultCatalog, OF_BUSINESS_CATALOG)
  assert.equal(provider.source, 'ofbusiness')
  assert.equal(provider.companyName, 'OfBusiness')
  assert.equal(provider.officialBrandName, 'OfBusiness')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.ofbcareers.com/')
  assert.equal(provider.companyCareerPage, 'https://www.ofbcareers.com/categories')
  assert.equal(provider.companyDomain, 'ofbcareers.com')
  assert.equal(provider.officialCareersLandingUrl, 'https://www.ofbcareers.com/')
  assert.equal(provider.wixWarmupScriptId, 'wix-warmup-data')
  assert.equal(provider.paginationQueryParam, 'comp-lyh6vd88_page')
  assert.equal(provider.atsPlatform, 'wix-embedded-data')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-wix-warmup-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-homepage+verified-categories-page+wix-warmup-data+paginated-first-party-job-slices+deduplication',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-01')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, August 1, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.ofbcareers\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.ofbcareers\.com\/categories/i)
  assert.match(provider.verifiedSurfaceSummary, /18 pages/i)
  assert.match(provider.verifiedSurfaceSummary, /72 unique records/i)
  assert.match(provider.verifiedSurfaceSummary, /71 valid public postings/i)
  assert.equal(provider.modulePath, ofBusinessModulePath)
  assert.match(provider.dryRunFile, /ofbusiness[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'OfBusiness'), false)
})

test('OfBusiness backlog row matches directly from the local catalog metadata', async () => {
  const { OF_BUSINESS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'OfBusiness\n',
    catalog: [OF_BUSINESS_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['OfBusiness', 'ofbusiness', 'OfBusiness']],
  )
})

test('getScraperCatalog exposes OfBusiness as a runnable shared provider without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ofbusiness')
  const scraper = buildScrapers().find((item) => item.name === 'ofbusiness')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'OfBusiness')
  assert.equal(provider.companyCareerPage, 'https://www.ofbcareers.com/categories')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'OfBusiness'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'OfBusiness\n',
    catalog: getScraperCatalog(),
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['OfBusiness', 'ofbusiness', 'OfBusiness']],
  )
})
