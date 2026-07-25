import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the PwC India custom script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const pwc = catalog.find((provider) => provider.source === 'pwc')

  assert.ok(pwc)
  assert.equal(pwc.adapter, 'script')
  assert.equal(pwc.atsPlatform, 'official-company-careers')
  assert.match(pwc.companyCareerPage, /pwc\.in\/careers\/experienced-jobs\.html/i)
  assert.equal(pwc.companyDomain, 'pwc.in')
})

test('buildScrapers exposes a runnable PwC scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const pwc = scrapers.find((scraper) => scraper.name === 'pwc')

  assert.ok(pwc)
  assert.equal(typeof pwc.run, 'function')
  assert.match(pwc.dryRunFile, /pwc[\\/]jobs\.json$/)
  assert.equal(pwc.provider.source, 'pwc')
  assert.equal(pwc.provider.atsPlatform, 'official-company-careers')
})
