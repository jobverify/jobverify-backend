import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes Hitachi India as a custom script provider with validated metadata and narrow aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'hitachiindia')

  assert.ok(provider)
  assert.equal(provider.companyName, 'HITACHI INDIA PVT. LTD')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'talemetry-careersites+workday-handoff')
  assert.equal(
    provider.companyCareerPage,
    'https://careers.hitachi.com/search/hitachi-india-pvt-ltd/jobs/in/country/india',
  )
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-company-filtered-search-page-or-cloudflare-challenge-sentinel',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-search-and-detail-pages-when-accessible+verified-cloudflare-challenge-empty-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.hitachi.com')
  assert.equal(provider.verifiedOn, '2026-08-14')
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare-managed HTTP 403 challenge pages titled "Just a moment\.\.\."/i)
  assert.match(provider.verifiedSurfaceSummary, /\bIndia 6\b/i)
  assert.match(provider.modulePath, /hitachiindia[\\/]script\.js$/)
  assert.equal(companyAliases.Hitachi, 'hitachiindia')
  assert.equal(companyAliases['HITACHI INDIA PVT. LTD'], 'hitachiindia')
  assert.equal(companyAliases['Hitachi India Pvt Ltd'], 'hitachiindia')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Hitachi Energy'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'GlobalLogic'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Hitachi Rail'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Hitachi Vantara'), false)
})

test('buildScrapers exposes a runnable Hitachi India scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'hitachiindia')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /hitachiindia[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'hitachiindia')
  assert.equal(scraper.provider.atsPlatform, 'talemetry-careersites+workday-handoff')
  assert.equal(
    scraper.provider.extractionStrategy,
    'verified-search-and-detail-pages-when-accessible+verified-cloudflare-challenge-empty-sentinel',
  )
})
