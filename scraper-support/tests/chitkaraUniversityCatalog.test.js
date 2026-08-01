import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Chitkara University as a first-party paginated careers script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'chitkarauniversity')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Chitkara University')
  assert.equal(provider.companyCareerPage, 'https://careers.chitkara.edu.in/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-wordpress-pagination')
  assert.equal(provider.extractionStrategy, 'verified-careers-pages+detail-pages+same-page-gravity-forms-apply')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.chitkara.edu.in')
  assert.match(provider.modulePath, /chitkarauniversity[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Chitkara University scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'chitkarauniversity')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'chitkarauniversity')
  assert.equal(scraper.provider.adapter, 'script')
  assert.match(scraper.dryRunFile, /chitkarauniversity[\\/]jobs\.json$/i)
})
