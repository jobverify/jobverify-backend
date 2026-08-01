import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Neeyamo as a Drupal openings custom script provider with verified India metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'neeyamo')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Neeyamo')
  assert.equal(provider.modulePath, '../../scraper/neeyamo/script.js')
  assert.equal(provider.companyCareerPage, 'https://www.neeyamo.com/careers')
  assert.equal(provider.companyDomain, 'neeyamo.com')
  assert.equal(provider.atsPlatform, 'drupal-openings')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page-drupal-view')
  assert.equal(provider.extractionStrategy, 'html-listing+detail-page+inline-webform-apply')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
})

test('buildScrapers exposes a runnable Neeyamo scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'neeyamo')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /neeyamo[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'neeyamo')
  assert.equal(scraper.provider.adapter, 'script')
  assert.equal(scraper.provider.modulePath, '../../scraper/neeyamo/script.js')
  assert.equal(scraper.provider.atsPlatform, 'drupal-openings')
  assert.equal(scraper.provider.countryFilter, 'India')
  assert.equal(scraper.provider.paginationStrategy, 'single-page-drupal-view')
  assert.equal(scraper.provider.extractionStrategy, 'html-listing+detail-page+inline-webform-apply')
  assert.equal(scraper.provider.parser, 'custom-script')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.neeyamo.com/careers')
})
