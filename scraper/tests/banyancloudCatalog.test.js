import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Banyan Cloud as a Keka script provider', () => {
  const catalog = getScraperCatalog()
  const banyan = catalog.find((provider) => provider.source === 'banyancloud')

  assert.ok(banyan)
  assert.equal(banyan.adapter, 'script')
  assert.equal(banyan.atsPlatform, 'keka-embed-api')
  assert.match(banyan.companyCareerPage, /banyancloud\.io\/career\/?$/i)
  assert.equal(banyan.companyDomain, 'banyancloud.io')
  assert.match(banyan.modulePath, /banyancloud[\\/]script\.js$/)
})

test('buildScrapers exposes a runnable Banyan Cloud scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const banyan = scrapers.find((scraper) => scraper.name === 'banyancloud')

  assert.ok(banyan)
  assert.equal(typeof banyan.run, 'function')
  assert.match(banyan.dryRunFile, /banyancloud[\\/]jobs\.json$/)
  assert.equal(banyan.provider.source, 'banyancloud')
  assert.equal(banyan.provider.atsPlatform, 'keka-embed-api')
})
