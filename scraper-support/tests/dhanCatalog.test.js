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
const dhanModulePath = path.resolve(currentDir, '../../scraper/dhan/script.js')

const loadDhanCatalog = async () => {
  try {
    return await import('../../scraper/dhan/catalog.js')
  } catch {
    assert.fail('Expected Dhan catalog module at ../../scraper/dhan/catalog.js')
  }
}

test('Dhan catalog captures the verified first-party career handoff and Keka jobs API surface', async () => {
  const { DHAN_CATALOG } = await loadDhanCatalog()
  const provider = hydrateProviderCatalogEntry(DHAN_CATALOG)

  assert.equal(provider.source, 'dhan')
  assert.equal(provider.companyName, 'Dhan')
  assert.equal(provider.officialBrandName, 'Dhan')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://dhan.co/')
  assert.equal(provider.companyCareerPage, 'https://dhan.co/career/')
  assert.equal(provider.officialCareersHandoffUrl, 'https://dhan.keka.com/careers/')
  assert.equal(provider.careersApiOrigin, 'https://dhan.keka.com/careers/api')
  assert.equal(provider.careersConfigUrl, null)
  assert.equal(provider.careersFilterParamsUrl, null)
  assert.equal(
    provider.jobsApiUrl,
    'https://dhan.keka.com/careers/api/embedjobs/default/active/7669ff3a-2b35-4442-9bac-9f9ae4b718b3',
  )
  assert.equal(provider.companyDomain, 'dhan.co')
  assert.equal(provider.atsPlatform, 'keka')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'keka-active-jobs-feed')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+keka-careers-handoff+keka-active-jobs-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-09-03')
  assert.equal(provider.modulePath, dhanModulePath)
  assert.match(provider.verifiedSurfaceSummary, /September 3, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dhan\.co\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dhan\.co\/career\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dhan\.keka\.com\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /Keka active-jobs endpoint/i)
  assert.match(provider.verifiedSurfaceSummary, /Keka job-detail application URLs/i)
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
