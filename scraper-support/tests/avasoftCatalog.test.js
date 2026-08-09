import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the AVASOFT careers page script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'avasoft')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.match(provider.companyCareerPage, /avasoft\.com\/career/i)
})

test('buildScrapers exposes a runnable AVASOFT scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'avasoft')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /avasoft[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'avasoft')
})
