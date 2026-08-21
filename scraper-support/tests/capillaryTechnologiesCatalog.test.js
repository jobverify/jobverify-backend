import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Capillary Technologies as an official careers scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'capillarytechnologies')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Capillary Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.capillarytech.com/careers/')
  assert.equal(provider.companyDomain, 'capillarytech.com')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.verifiedOn, '2026-08-13')
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare/i)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, August 13, 2026/i)
  assert.match(provider.modulePath, /capillarytechnologies[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Capillary Technologies scraper', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'capillarytechnologies')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.companyCareerPage, 'https://www.capillarytech.com/careers/')
})
