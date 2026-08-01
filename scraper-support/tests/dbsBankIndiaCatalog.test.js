import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dbsBankIndiaModulePath = path.resolve(currentDir, '../../scraper/dbsbankindia.workday/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/dbsbankindia.workday/catalog.js')
  } catch {
    assert.fail('Expected DBS Bank India catalog module at ../../scraper/dbsbankindia.workday/catalog.js')
  }
}

test('DBS Bank India local catalog captures the verified first-party careers handoff and public Workday metadata', async () => {
  const {
    DBS_BANK_INDIA_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
  } = await loadCatalogModule()

  assert.equal(DBS_BANK_INDIA_CATALOG.source, 'dbsbankindia')
  assert.equal(DBS_BANK_INDIA_CATALOG.companyName, 'DBS Bank India')
  assert.equal(DBS_BANK_INDIA_CATALOG.officialBrandName, 'DBS')
  assert.equal(DBS_BANK_INDIA_CATALOG.adapter, 'script')
  assert.equal(DBS_BANK_INDIA_CATALOG.modulePath, dbsBankIndiaModulePath)
  assert.equal(DBS_BANK_INDIA_CATALOG.dryRunFile, 'dbsbankindia.workday/jobs.json')
  assert.equal(DBS_BANK_INDIA_CATALOG.companyCareerPage, 'https://www.dbs.com/careers/default.page')
  assert.equal(DBS_BANK_INDIA_CATALOG.companyDomain, 'dbs.com')
  assert.equal(DBS_BANK_INDIA_CATALOG.officialHomepageUrl, 'https://www.dbs.com/in/index/default.page')
  assert.equal(DBS_BANK_INDIA_CATALOG.officialWorkdayBoardUrl, 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers')
  assert.equal(
    DBS_BANK_INDIA_CATALOG.jobsApiUrl,
    'https://dbs.wd3.myworkdayjobs.com/wday/cxs/dbs/DBS_Careers/jobs',
  )
  assert.equal(
    DBS_BANK_INDIA_CATALOG.verifiedIndiaCountryFacetId,
    'c4f78be1a8f14da0ab49ce1162348a5e',
  )
  assert.equal(
    DBS_BANK_INDIA_CATALOG.verifiedIndiaJobUrl,
    'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Kolkata-DBIL/Associate--Relationship-Manager--Credit-Program-Small--Small-Medium-Enterprises_WD86720',
  )
  assert.equal(DBS_BANK_INDIA_CATALOG.atsPlatform, 'workday')
  assert.equal(DBS_BANK_INDIA_CATALOG.countryFilter, 'India')
  assert.equal(
    DBS_BANK_INDIA_CATALOG.paginationStrategy,
    'verified-first-party-careers-handoff-plus-workday-country-facet',
  )
  assert.equal(
    DBS_BANK_INDIA_CATALOG.extractionStrategy,
    'verified-careers-page+verified-workday-board+unfiltered-workday-jobs-api+india-country-facet+filtered-workday-jobs-api',
  )
  assert.equal(DBS_BANK_INDIA_CATALOG.parser, 'custom-script')
  assert.equal(DBS_BANK_INDIA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DBS_BANK_INDIA_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(DBS_BANK_INDIA_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.dbs\.com\/careers\/default\.page/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/dbs\.wd3\.myworkdayjobs\.com\/DBS_Careers/i)
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /https:\/\/dbs\.wd3\.myworkdayjobs\.com\/wday\/cxs\/dbs\/DBS_Careers\/jobs/i,
  )
  assert.match(VERIFIED_SURFACE_SUMMARY, /\b484 India roles\b/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /c4f78be1a8f14da0ab49ce1162348a5e/i)
})

test('DBS Bank India local catalog hydrates into coverage without needing an alias entry', async () => {
  const { DBS_BANK_INDIA_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(DBS_BANK_INDIA_CATALOG)

  assert.equal(provider.companyName, 'DBS Bank India')
  assert.equal(provider.companyDomain, 'dbs.com')
  assert.match(provider.modulePath, /dbsbankindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /dbsbankindia.workday[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'DBS Bank India\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DBS Bank India', 'dbsbankindia', 'DBS Bank India']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'DBS Bank India'), false)
})
