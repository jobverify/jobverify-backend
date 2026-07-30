import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const loadCatalog = async () => {
  try {
    return await import('../airbyte/catalog.js')
  } catch {
    assert.fail('Expected Airbyte catalog module at ../airbyte/catalog.js')
  }
}

test('Airbyte catalog captures the verified first-party careers and Ashby metadata', async () => {
  const { AIRBYTE_CATALOG } = await loadCatalog()
  const provider = hydrateProviderCatalogEntry(AIRBYTE_CATALOG)

  assert.equal(provider.source, 'airbyte')
  assert.equal(provider.companyName, 'Airbyte')
  assert.equal(provider.officialBrandName, 'Airbyte')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://airbyte.com/company/careers')
  assert.equal(provider.ashbyPublicBoardUrl, 'https://jobs.ashbyhq.com/airbyte')
  assert.equal(provider.ashbyJobBoardUrl, 'https://api.ashbyhq.com/posting-api/job-board/airbyte')
  assert.equal(provider.atsPlatform, 'ashby')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-ashby-job-board-get')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-public-ashby-board+public-ashby-get-feed+india-location-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'airbyte.com')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /airbyte[\\/]script\.js$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/airbyte\.com\/company\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/jobs\.ashbyhq\.com\/airbyte/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/api\.ashbyhq\.com\/posting-api\/job-board\/airbyte/i)
  assert.match(provider.verifiedSurfaceSummary, /Engineering Manager, Platform/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior AI Platform Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /zero India openings/i)
})

test('buildScrapers and company coverage resolve Airbyte from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'airbyte')
  const scraper = buildScrapers().find((item) => item.name === 'airbyte')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Airbyte')
  assert.equal(provider.companyCareerPage, 'https://airbyte.com/company/careers')
  assert.match(scraper.dryRunFile, /airbyte[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Airbyte\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Airbyte', 'airbyte', 'Airbyte']],
  )
})
