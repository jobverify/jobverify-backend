import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Chalo as a first-party jobs-page scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'chalo')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Chalo')
  assert.equal(provider.companyCareerPage, 'https://chalo.com/jobs')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-jobs-page')
  assert.equal(provider.extractionStrategy, 'homepage-plus-jobs-page-inline-cards+same-page-apply-form')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'chalo.com')
  assert.match(provider.modulePath, /chalo[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Chalo scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'chalo')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'chalo')
  assert.equal(scraper.provider.adapter, 'script')
  assert.match(scraper.dryRunFile, /chalo[\\/]jobs\.json$/i)
})
