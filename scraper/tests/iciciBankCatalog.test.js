import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes ICICI Bank Ltd as an official public careers API scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'icicibank')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.icicicareers.com/CareerApplicant/Career/Home')
  assert.equal(provider.companyDomain, 'icicicareers.com')
  assert.match(provider.modulePath, /icicibank[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable ICICI Bank scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'icicibank')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /icicibank[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'icicibank')
})
