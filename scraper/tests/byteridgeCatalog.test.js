import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Byteridge with its public careers page metadata', () => {
  const catalog = getScraperCatalog()
  const byteridge = catalog.find((provider) => provider.source === 'byteridge')

  assert.ok(byteridge)
  assert.equal(byteridge.adapter, 'script')
  assert.equal(byteridge.atsPlatform, 'official-company-careers')
  assert.equal(byteridge.companyCareerPage, 'https://byteridge.com/careers/')
  assert.equal(byteridge.companyDomain, 'byteridge.com')
})

test('buildScrapers exposes a runnable Byteridge scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const byteridge = scrapers.find((scraper) => scraper.name === 'byteridge')

  assert.ok(byteridge)
  assert.equal(typeof byteridge.run, 'function')
  assert.match(byteridge.dryRunFile, /byteridge[\\/]jobs\.json$/)
  assert.equal(byteridge.provider.source, 'byteridge')
  assert.equal(byteridge.provider.adapter, 'script')
})
