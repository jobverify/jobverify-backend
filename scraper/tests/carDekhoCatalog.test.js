import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes CarDekho as a first-party Darwinbox wrapper with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'cardekho')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'CarDekho')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://careers.cardekho.com/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'official-careers-handoff+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.match(provider.modulePath, /cardekho[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable CarDekho scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((item) => item.name === 'cardekho')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.source, 'cardekho')
  assert.equal(provider.provider.adapter, 'script')
  assert.match(provider.dryRunFile, /cardekho[\\/]jobs\.json$/i)
})
