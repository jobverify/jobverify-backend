import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Federal Bank as an official careers no-public-listings scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'federalbank')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.federal.bank.in/careers')
  assert.equal(provider.companyDomain, 'federal.bank.in')
  assert.match(provider.modulePath, /federalbank[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Federal Bank scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'federalbank')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.atsPlatform, 'official-company-careers')
  assert.match(provider.dryRunFile, /federalbank[\\/]jobs\.json$/)
})
