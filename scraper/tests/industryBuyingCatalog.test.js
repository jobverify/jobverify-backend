import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const industryBuyingModulePath = path.resolve(currentDir, '../industrybuying/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../industrybuying/catalog.js')
  } catch {
    assert.fail('Expected IndustryBuying catalog module at ../industrybuying/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../industrybuying/script.js')
  } catch {
    assert.fail('Expected IndustryBuying scraper module at ../industrybuying/script.js')
  }
}

test('IndustryBuying local catalog captures the verified first-party Keka handoff without alias churn', async () => {
  const { INDUSTRY_BUYING_CATALOG } = await loadCatalogModule()
  const industryBuying = await loadScriptModule()

  assert.equal(INDUSTRY_BUYING_CATALOG.source, 'industrybuying')
  assert.equal(INDUSTRY_BUYING_CATALOG.companyName, 'IndustryBuying')
  assert.equal(INDUSTRY_BUYING_CATALOG.officialBrandName, 'IndustryBuying')
  assert.equal(INDUSTRY_BUYING_CATALOG.adapter, 'script')
  assert.equal(INDUSTRY_BUYING_CATALOG.companyCareerPage, 'https://industrybuying.keka.com/careers/')
  assert.equal(INDUSTRY_BUYING_CATALOG.officialHomepageUrl, 'https://www.industrybuying.com/')
  assert.equal(INDUSTRY_BUYING_CATALOG.officialCareersHandoffPageUrl, 'https://www.industrybuying.com/')
  assert.equal(INDUSTRY_BUYING_CATALOG.kekaCareerPageUrl, 'https://industrybuying.keka.com/careers/')
  assert.equal(
    INDUSTRY_BUYING_CATALOG.kekaCareerPortalInfoUrl,
    'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo',
  )
  assert.equal(
    INDUSTRY_BUYING_CATALOG.kekaActiveJobsUrl,
    'https://industrybuying.keka.com/careers/api/embedjobs/default/active/e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
  )
  assert.equal(INDUSTRY_BUYING_CATALOG.expectedKekaIdentifier, 'e3038951-eb0d-4a7c-86f2-ae81cdef2d70')
  assert.equal(INDUSTRY_BUYING_CATALOG.expectedKekaDomain, 'https://industrybuying.keka.com/careers/')
  assert.equal(INDUSTRY_BUYING_CATALOG.expectedPortalName, 'IndustryBuying')
  assert.equal(INDUSTRY_BUYING_CATALOG.atsPlatform, 'keka-embed-api')
  assert.equal(INDUSTRY_BUYING_CATALOG.countryFilter, 'India')
  assert.equal(INDUSTRY_BUYING_CATALOG.paginationStrategy, 'keka-embed-active-jobs-api')
  assert.equal(
    INDUSTRY_BUYING_CATALOG.extractionStrategy,
    'verified-first-party-homepage-footer-handoff+verified-keka-bootstrap+verified-active-jobs-api',
  )
  assert.equal(INDUSTRY_BUYING_CATALOG.parser, 'custom-script')
  assert.equal(INDUSTRY_BUYING_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INDUSTRY_BUYING_CATALOG.companyDomain, 'industrybuying.com')
  assert.equal(INDUSTRY_BUYING_CATALOG.verifiedOn, '2026-07-16')
  assert.match(INDUSTRY_BUYING_CATALOG.dryRunFile, /industrybuying[\\/]jobs\.json$/i)
  assert.match(INDUSTRY_BUYING_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.industrybuying\.com\//i)
  assert.match(INDUSTRY_BUYING_CATALOG.verifiedSurfaceSummary, /https:\/\/industrybuying\.keka\.com\/careers\//i)
  assert.match(INDUSTRY_BUYING_CATALOG.verifiedSurfaceSummary, /Senior Manager Finance/i)
  assert.match(INDUSTRY_BUYING_CATALOG.verifiedSurfaceSummary, /Category Owner - June/i)
  assert.match(INDUSTRY_BUYING_CATALOG.verifiedSurfaceSummary, /Category Group Head - June/i)
  assert.equal(INDUSTRY_BUYING_CATALOG.modulePath, industryBuyingModulePath)

  assert.equal(industryBuying.PROVIDER_METADATA.source, INDUSTRY_BUYING_CATALOG.source)
  assert.equal(industryBuying.PROVIDER_METADATA.companyName, INDUSTRY_BUYING_CATALOG.companyName)
  assert.equal(
    industryBuying.PROVIDER_METADATA.kekaActiveJobsUrl,
    INDUSTRY_BUYING_CATALOG.kekaActiveJobsUrl,
  )
})

test('IndustryBuying backlog row matches directly from the local catalog without alias changes', async () => {
  const { INDUSTRY_BUYING_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'IndustryBuying\n',
    catalog: [INDUSTRY_BUYING_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['IndustryBuying', 'industrybuying', 'IndustryBuying']],
  )
})

test('getScraperCatalog includes IndustryBuying as a verified Keka provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'industrybuying')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'IndustryBuying')
  assert.equal(provider.companyCareerPage, 'https://industrybuying.keka.com/careers/')
  assert.equal(provider.companyDomain, 'industrybuying.com')
  assert.equal(provider.atsPlatform, 'keka-embed-api')
  assert.match(provider.modulePath, /industrybuying[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable IndustryBuying scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'industrybuying')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'industrybuying')
  assert.equal(scraper.provider.atsPlatform, 'keka-embed-api')
  assert.match(scraper.dryRunFile, /industrybuying[\\/]jobs\.json$/i)
})
