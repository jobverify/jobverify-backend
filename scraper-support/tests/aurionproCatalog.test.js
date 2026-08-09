import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the AurionPro ZingHR script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'aurionpro')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'zinghr')
  assert.match(provider.companyCareerPage, /zingnext\.zinghr\.com\/portal\/embed\/career-website/i)
})

test('buildScrapers exposes a runnable AurionPro scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'aurionpro')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /aurionpro[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'aurionpro')
})
