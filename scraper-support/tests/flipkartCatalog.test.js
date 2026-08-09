import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes the Flipkart script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const flipkart = catalog.find((provider) => provider.source === 'flipkart')

  assert.ok(flipkart)
  assert.equal(flipkart.adapter, 'script')
  assert.equal(flipkart.atsPlatform, 'turbohire')
  assert.match(flipkart.companyCareerPage, /flipkartcareers\.com/i)
  assert.equal(flipkart.companyDomain, 'flipkartcareers.com')
  assert.equal(flipkart.parser, 'custom-script')
  assert.match(flipkart.modulePath, /flipkart[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Flipkart script scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const flipkart = scrapers.find((scraper) => scraper.name === 'flipkart')

  assert.ok(flipkart)
  assert.equal(typeof flipkart.run, 'function')
  assert.equal(flipkart.provider.adapter, 'script')
  assert.equal(flipkart.provider.parser, 'custom-script')
  assert.match(flipkart.provider.companyCareerPage, /flipkartcareers\.com/i)
})
