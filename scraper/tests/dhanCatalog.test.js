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
const dhanModulePath = path.resolve(currentDir, '../dhan/script.js')

const loadDhanCatalog = async () => {
  try {
    return await import('../dhan/catalog.js')
  } catch {
    assert.fail('Expected Dhan catalog module at ../dhan/catalog.js')
  }
}

test('Dhan catalog captures the verified first-party career handoff and Zappyhire jobs API surface', async () => {
  const { DHAN_CATALOG } = await loadDhanCatalog()
  const provider = hydrateProviderCatalogEntry(DHAN_CATALOG)

  assert.equal(provider.source, 'dhan')
  assert.equal(provider.companyName, 'Dhan')
  assert.equal(provider.officialBrandName, 'Dhan')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://dhan.co/')
  assert.equal(provider.companyCareerPage, 'https://dhan.co/career/')
  assert.equal(provider.officialCareersHandoffUrl, 'https://recruitcareers.zappyhire.com/en/dhan')
  assert.equal(provider.careersApiOrigin, 'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com')
  assert.equal(
    provider.careersConfigUrl,
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/configurations/',
  )
  assert.equal(
    provider.careersFilterParamsUrl,
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/filter-params/',
  )
  assert.equal(
    provider.jobsApiUrl,
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/jobs/jobsearch/?page=1&page_size=12',
  )
  assert.equal(provider.companyDomain, 'dhan.co')
  assert.equal(provider.atsPlatform, 'zappyhire')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'zappyhire-jobsearch-page-parameter')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+zappyhire-board-shell+zappyhire-config-api+zappyhire-jobsearch-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.equal(provider.modulePath, dhanModulePath)
  assert.match(provider.verifiedSurfaceSummary, /July 15, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dhan\.co\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dhan\.co\/career\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/recruitcareers\.zappyhire\.com\/en\/dhan/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/dhan\.zappyhire-multitenant-be-prod\.zappyhire\.com\/api\/careers\/configurations\//i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/dhan\.zappyhire-multitenant-be-prod\.zappyhire\.com\/api\/jobs\/jobsearch\/\?page=1&page_size=12/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /Raise Careers/i)
  assert.match(provider.verifiedSurfaceSummary, /Product & Growth Marketing - fuzz \(Raise AI\)/i)
})

test('Dhan backlog row matches directly from provider metadata without aliases', async () => {
  const { DHAN_CATALOG } = await loadDhanCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'Dhan\n',
    catalog: [hydrateProviderCatalogEntry(DHAN_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dhan', 'dhan', 'Dhan']],
  )
})

test('buildScrapers and company coverage resolve Dhan from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dhan')
  const scraper = buildScrapers().find((item) => item.name === 'dhan')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Dhan')
  assert.equal(provider.companyCareerPage, 'https://dhan.co/career/')
  assert.match(scraper.dryRunFile, /dhan[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Dhan\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dhan', 'dhan', 'Dhan']],
  )
})
