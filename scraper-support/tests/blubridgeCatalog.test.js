import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Blubridge with its official careers site metadata', () => {
  const catalog = getScraperCatalog()
  const blubridge = catalog.find((provider) => provider.source === 'blubridge')

  assert.ok(blubridge)
  assert.equal(blubridge.adapter, 'script')
  assert.equal(blubridge.atsPlatform, 'react-company-careers')
  assert.match(blubridge.companyCareerPage, /blubridge\.com\/careers/i)
  assert.equal(blubridge.companyDomain, 'blubridge.com')
})

test('buildScrapers exposes a runnable Blubridge scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const blubridge = scrapers.find((scraper) => scraper.name === 'blubridge')

  assert.ok(blubridge)
  assert.equal(typeof blubridge.run, 'function')
  assert.match(blubridge.dryRunFile, /blubridge[\\/]jobs\.json$/)
  assert.equal(blubridge.provider.source, 'blubridge')
  assert.equal(blubridge.provider.adapter, 'script')
})
