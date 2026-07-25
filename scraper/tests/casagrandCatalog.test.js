import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Casagrand as a Darwinbox-backed script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'casagrand')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Casagrand')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://casagrand.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'page-body')
  assert.equal(provider.extractionStrategy, 'json-search-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.match(provider.modulePath, /casagrand[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Casagrand scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((item) => item.name === 'casagrand')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.source, 'casagrand')
  assert.equal(provider.provider.adapter, 'script')
  assert.match(provider.dryRunFile, /casagrand[\\/]jobs\.json$/i)
})
