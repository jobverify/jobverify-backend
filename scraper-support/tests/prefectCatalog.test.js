import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Prefect as a first-party-verified Ashby script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'prefect')

  assert.ok(provider, 'Expected Prefect provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Prefect')
  assert.equal(provider.officialBrandName, 'Prefect')
  assert.equal(provider.companyCareerPage, 'https://www.prefect.io/company')
  assert.equal(provider.ashbyPublicBoardUrl, 'https://jobs.ashbyhq.com/prefect')
  assert.equal(provider.ashbyJobBoardUrl, 'https://api.ashbyhq.com/posting-api/job-board/prefect')
  assert.equal(provider.atsPlatform, 'ashby')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-ashby-job-board-get')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-company-page+verified-public-ashby-board+public-ashby-get-feed+india-location-filter',
  )
  assert.equal(provider.companyDomain, 'prefect.io')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /prefect[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /prefect[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.prefect\.io\/company/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/jobs\.ashbyhq\.com\/prefect/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/api\.ashbyhq\.com\/posting-api\/job-board\/prefect/i)
  assert.match(provider.verifiedSurfaceSummary, /Product Engineer \(Fullstack, Cloud\)/i)
  assert.match(provider.verifiedSurfaceSummary, /zero India openings/i)
})

test('buildScrapers exposes a runnable Prefect scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'prefect')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /prefect[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'prefect')
  assert.equal(scraper.provider.atsPlatform, 'ashby')
})
