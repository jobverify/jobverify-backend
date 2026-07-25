import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Electrifex as an official first-party careers scraper', () => {
  const catalog = getScraperCatalog()
  const electrifex = catalog.find((provider) => provider.source === 'electrifex')

  assert.ok(electrifex)
  assert.equal(electrifex.adapter, 'script')
  assert.equal(electrifex.atsPlatform, 'official-company-careers')
  assert.match(electrifex.companyCareerPage, /talents\.electrifex\.com/i)
  assert.equal(electrifex.companyDomain, 'talents.electrifex.com')
})

test('buildScrapers exposes a runnable Electrifex scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const electrifex = scrapers.find((scraper) => scraper.name === 'electrifex')

  assert.ok(electrifex)
  assert.equal(typeof electrifex.run, 'function')
  assert.match(electrifex.dryRunFile, /electrifex[\\/]jobs\.json$/)
  assert.equal(electrifex.provider.source, 'electrifex')
  assert.equal(electrifex.provider.atsPlatform, 'official-company-careers')
})
