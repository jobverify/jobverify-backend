import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes CARIAD on the official Volkswagen Group jobs host', () => {
  const catalog = getScraperCatalog()
  const cariad = catalog.find((provider) => provider.source === 'cariad')

  assert.ok(cariad)
  assert.equal(cariad.adapter, 'script')
  assert.equal(cariad.atsPlatform, 'successfactors')
  assert.equal(cariad.companyName, 'CARIAD')
  assert.match(cariad.companyCareerPage, /jobs\.volkswagen-group\.com\/cariad/i)
  assert.equal(cariad.companyDomain, 'jobs.volkswagen-group.com')
})

test('buildScrapers exposes a runnable CARIAD scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const cariad = scrapers.find((scraper) => scraper.name === 'cariad')

  assert.ok(cariad)
  assert.equal(typeof cariad.run, 'function')
  assert.match(cariad.dryRunFile, /cariad[\\/]jobs\.json$/)
  assert.equal(cariad.provider.source, 'cariad')
  assert.equal(cariad.provider.adapter, 'script')
})
