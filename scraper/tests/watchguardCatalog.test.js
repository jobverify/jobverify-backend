import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the WatchGuard Technologies Lever apiPortal provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const watchguard = catalog.find((provider) => provider.source === 'watchguard')

  assert.ok(watchguard)
  assert.equal(watchguard.adapter, 'apiPortal')
  assert.equal(watchguard.atsPlatform, 'lever')
  assert.equal(watchguard.companyName, 'WatchGuard Technologies')
  assert.match(watchguard.companyCareerPage, /watchguard\.com\/wgrd-careers\/?$/i)
  assert.equal(watchguard.companyDomain, 'watchguard.com')
  assert.match(watchguard.config.discovery.listingApiUrl, /api\.lever\.co\/v0\/postings\/watchguard/i)
})

test('buildScrapers exposes a runnable WatchGuard apiPortal scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const watchguard = scrapers.find((scraper) => scraper.name === 'watchguard')

  assert.ok(watchguard)
  assert.equal(typeof watchguard.run, 'function')
  assert.match(watchguard.dryRunFile, /watchguard[\\/]jobs\.json$/)
  assert.equal(watchguard.provider.source, 'watchguard')
  assert.equal(watchguard.provider.atsPlatform, 'lever')
})
