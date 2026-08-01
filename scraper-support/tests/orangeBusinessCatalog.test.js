import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Orange Business Phenom script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const orange = catalog.find((provider) => provider.source === 'orangebusiness')

  assert.ok(orange)
  assert.equal(orange.adapter, 'script')
  assert.equal(orange.atsPlatform, 'phenom')
  assert.match(orange.companyCareerPage, /orange\.jobs\/gb\/en\/search-results\?companyName=Orange/i)
  assert.equal(orange.companyDomain, 'orange-business.com')
  assert.match(orange.modulePath, /orangebusiness[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Orange Business scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const orange = scrapers.find((scraper) => scraper.name === 'orangebusiness')

  assert.ok(orange)
  assert.equal(typeof orange.run, 'function')
  assert.match(orange.dryRunFile, /orangebusiness[\\/]jobs\.json$/)
  assert.equal(orange.provider.source, 'orangebusiness')
  assert.equal(orange.provider.atsPlatform, 'phenom')
})
