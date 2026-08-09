import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the ASAPP Lever apiPortal provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const asapp = catalog.find((provider) => provider.source === 'asapp')

  assert.ok(asapp)
  assert.equal(asapp.adapter, 'apiPortal')
  assert.equal(asapp.atsPlatform, 'lever')
  assert.match(asapp.companyCareerPage, /asapp\.com\/careers/i)
  assert.equal(asapp.companyDomain, 'asapp.com')
  assert.match(asapp.config.discovery.listingApiUrl, /api\.lever\.co\/v0\/postings\/asapp-2/i)
})

test('buildScrapers exposes a runnable ASAPP apiPortal scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const asapp = scrapers.find((scraper) => scraper.name === 'asapp')

  assert.ok(asapp)
  assert.equal(typeof asapp.run, 'function')
  assert.match(asapp.dryRunFile, /asapp[\\/]jobs\.json$/)
  assert.equal(asapp.provider.source, 'asapp')
  assert.equal(asapp.provider.atsPlatform, 'lever')
})
