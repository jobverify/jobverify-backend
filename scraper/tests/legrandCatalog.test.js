import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Legrand Oracle Cloud script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'legrand')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.match(provider.companyCareerPage, /careers\.legrand\.com\/en\/sites\/CX_1001\/jobs\?location=India/i)
  assert.equal(provider.companyDomain, 'careers.legrand.com')
})

test('buildScrapers exposes a runnable Legrand scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'legrand')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /legrand[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'legrand')
})
