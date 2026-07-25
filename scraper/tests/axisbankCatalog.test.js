import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Axis Bank RippleHire script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'axisbank')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'ripplehire')
  assert.match(provider.companyCareerPage, /axisbank\.com\/careers/i)
})

test('buildScrapers exposes a runnable Axis Bank scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'axisbank')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /axisbank[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'axisbank')
})
