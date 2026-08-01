import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Fiserv Phenom script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'fiserv')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'phenom')
  assert.equal(provider.companyCareerPage, 'https://careers.fiserv.com/us/en')
  assert.equal(provider.companyDomain, 'careers.fiserv.com')
  assert.match(provider.modulePath, /fiserv[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Fiserv scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'fiserv')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.match(provider.dryRunFile, /fiserv[\\/]jobs\.json$/)
  assert.equal(provider.provider.source, 'fiserv')
  assert.equal(provider.provider.atsPlatform, 'phenom')
})
