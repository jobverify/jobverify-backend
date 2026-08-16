import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/avenuesupermarts/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/avenuesupermarts/catalog.js')
  } catch {
    assert.fail('Expected Avenue Supermarts catalog module at ../../scraper/avenuesupermarts/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/avenuesupermarts/script.js')
  } catch {
    assert.fail('Expected Avenue Supermarts scraper module at ../../scraper/avenuesupermarts/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Avenue Supermarts local catalog captures the verified first-party DMart careers page and public SuccessFactors board', async () => {
  const { AVENUE_SUPERMARTS_CATALOG } = await loadCatalogModule()
  const avenueSupermarts = await loadScraperModule()
  const provider = buildCatalogReadyProvider(AVENUE_SUPERMARTS_CATALOG)

  assert.equal(provider.source, 'avenuesupermarts')
  assert.equal(provider.companyName, 'Avenue Supermarts')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.dmartindia.com/careers')
  assert.equal(provider.homepageUrl, 'https://www.dmartindia.com/')
  assert.equal(provider.corporateHomepageUrl, 'https://www.avenuesupermarts.com/')
  assert.equal(provider.corporateLanderUrl, 'https://www.avenuesupermarts.com/lander')
  assert.equal(provider.successFactorsCompanyToken, 'avenuesupe')
  assert.equal(provider.successFactorsBoardUrl, 'https://career10.successfactors.com/career?company=avenuesupe')
  assert.equal(
    provider.successFactorsSearchUrl,
    'https://career10.successfactors.com/career?company=avenuesupe&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  )
  assert.equal(
    provider.verifiedSampleJobUrl,
    'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=109412&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  )
  assert.equal(provider.companyDomain, 'dmartindia.com')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'successfactors-dwr-initial-search')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-dmart-careers-page+successfactors-bootstrap+dwr-search-results+detail-pages',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-13')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /avenuesupermarts[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, August 13, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dmartindia\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/career10\.successfactors\.com\/career\?company=avenuesupe/i)
  assert.match(provider.verifiedSurfaceSummary, /career_job_req_id=109412/i)
  assert.match(provider.verifiedSurfaceSummary, /30 India postings/i)

  assert.equal(avenueSupermarts.PROVIDER_METADATA.source, provider.source)
  assert.equal(avenueSupermarts.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(avenueSupermarts.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(
    avenueSupermarts.PROVIDER_METADATA.successFactorsSearchUrl,
    provider.successFactorsSearchUrl,
  )
})

test('Avenue Supermarts backlog row matches directly from local provider metadata without alias churn', async () => {
  const { AVENUE_SUPERMARTS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Avenue Supermarts\n',
    catalog: [buildCatalogReadyProvider(AVENUE_SUPERMARTS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Avenue Supermarts', 'avenuesupermarts', 'Avenue Supermarts']],
  )
})

test('buildScrapers and company coverage resolve Avenue Supermarts from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'avenuesupermarts')
  const scraper = buildScrapers().find((item) => item.name === 'avenuesupermarts')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Avenue Supermarts')
  assert.equal(provider.companyCareerPage, 'https://www.dmartindia.com/careers')
  assert.match(scraper.dryRunFile, /avenuesupermarts[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Avenue Supermarts\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Avenue Supermarts', 'avenuesupermarts', 'Avenue Supermarts']],
  )
})
