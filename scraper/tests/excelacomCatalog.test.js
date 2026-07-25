import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Excelacom as an Oracle Taleo RSS script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'excelacom')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'oracle-taleo')
  assert.equal(provider.companyName, 'Excelacom')
  assert.equal(provider.companyCareerPage, 'https://phg.tbe.taleo.net/phg02/ats/careers/v2/searchResults?org=EXCELACOM&cws=38')
  assert.equal(provider.companyDomain, 'phg.tbe.taleo.net')
  assert.match(provider.modulePath, /excelacom[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Excelacom scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'excelacom')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'excelacom')
  assert.equal(scraper.provider.atsPlatform, 'oracle-taleo')
  assert.match(scraper.dryRunFile, /excelacom[\\/]jobs\.json$/)
})
