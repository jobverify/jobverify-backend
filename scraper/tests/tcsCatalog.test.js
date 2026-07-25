import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the TCS custom script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const tcs = catalog.find((provider) => provider.source === 'tcs')

  assert.ok(tcs)
  assert.equal(tcs.adapter, 'script')
  assert.equal(tcs.atsPlatform, 'official-company-careers')
  assert.match(tcs.companyCareerPage, /ibegin\.tcsapps\.com\/candidate\/?$/i)
  assert.equal(tcs.companyDomain, 'ibegin.tcsapps.com')
})

test('buildScrapers exposes a runnable TCS scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const tcs = scrapers.find((scraper) => scraper.name === 'tcs')

  assert.ok(tcs)
  assert.equal(typeof tcs.run, 'function')
  assert.match(tcs.dryRunFile, /tcs[\\/]jobs\.json$/)
  assert.equal(tcs.provider.source, 'tcs')
  assert.equal(tcs.provider.atsPlatform, 'official-company-careers')
})
