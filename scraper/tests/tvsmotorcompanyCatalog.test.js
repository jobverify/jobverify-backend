import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes TVS Motor Company as a Darwinbox-backed script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'tvsmotorcompany')

  assert.ok(provider)
  assert.equal(provider.companyName, 'TVS Motor Company')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://www.tvsmotor.com/about-us/careers/overview')
  assert.equal(provider.companyDomain, 'tvsmotor.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'darwinbox-alljobs-api-via-hosted-origin')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /tvsmotorcompany[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable TVS Motor Company scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'tvsmotorcompany')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /tvsmotorcompany[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'tvsmotorcompany')
})
