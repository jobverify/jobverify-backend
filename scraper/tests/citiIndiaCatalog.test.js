import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Citi India as a TalentBrew/Radancy script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'citiindia')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Citi India')
  assert.equal(provider.companyCareerPage, 'https://jobs.citi.com/search-jobs?acm=ALL&alrpm=1269750&ascf=%5B%7B%22key%22%3A%22ALL%22%2C%22value%22%3A%22%22%7D%5D')
  assert.equal(provider.atsPlatform, 'talentbrew-radancy')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'page-query')
  assert.equal(provider.extractionStrategy, 'html-search-results+detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'jobs.citi.com')
  assert.match(provider.modulePath, /citiindia[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Citi India scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'citiindia')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'citiindia')
  assert.equal(scraper.provider.atsPlatform, 'talentbrew-radancy')
  assert.match(scraper.dryRunFile, /citiindia[\\/]jobs\.json$/i)
})
