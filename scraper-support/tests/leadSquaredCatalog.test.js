import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes LeadSquared as an official Darwinbox script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'leadsquared')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyName, 'LeadSquared')
  assert.equal(provider.companyCareerPage, 'https://leadsquaredhrms.darwinbox.in/ms/candidatev2/main/careers/home')
  assert.equal(provider.companyDomain, 'leadsquaredhrms.darwinbox.in')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'darwinbox-browser-session-listing-api')
  assert.match(provider.modulePath, /leadsquared[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable LeadSquared scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'leadsquared')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'leadsquared')
  assert.equal(scraper.provider.atsPlatform, 'darwinbox')
  assert.match(scraper.dryRunFile, /leadsquared[\\/]jobs\.json$/)
})
