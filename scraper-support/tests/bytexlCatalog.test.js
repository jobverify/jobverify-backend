import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes byteXL as an official careers script provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'bytexl')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://bytexl.com/careers.php')
  assert.equal(provider.companyDomain, 'bytexl.com')
  assert.match(provider.modulePath, /bytexl[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable byteXL scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'bytexl')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.atsPlatform, 'official-company-careers')
  assert.match(provider.dryRunFile, /bytexl[\\/]jobs\.json$/)
})
