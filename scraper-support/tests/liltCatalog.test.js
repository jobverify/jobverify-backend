import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes LILT as a first-party-verified Ashby script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lilt')

  assert.ok(provider, 'Expected LILT provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'LILT')
  assert.equal(provider.officialBrandName, 'LILT')
  assert.equal(provider.companyCareerPage, 'https://lilt.com/products/community')
  assert.equal(provider.ashbyPublicBoardUrl, 'https://jobs.ashbyhq.com/lilt-production')
  assert.equal(provider.ashbyJobBoardUrl, 'https://api.ashbyhq.com/posting-api/job-board/lilt-production')
  assert.equal(provider.atsPlatform, 'ashby')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-ashby-job-board-get')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-community-page+verified-public-ashby-board+public-ashby-get-feed+india-location-filter',
  )
  assert.equal(provider.companyDomain, 'lilt.com')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /lilt[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /lilt[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/lilt\.com\/products\/community/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/jobs\.ashbyhq\.com\/lilt-production/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/api\.ashbyhq\.com\/posting-api\/job-board\/lilt-production/i)
  assert.match(provider.verifiedSurfaceSummary, /Talent Manager/i)
  assert.match(provider.verifiedSurfaceSummary, /India \(Remote\)/i)
})

test('buildScrapers exposes a runnable LILT scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'lilt')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /lilt[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'lilt')
  assert.equal(scraper.provider.atsPlatform, 'ashby')
})
