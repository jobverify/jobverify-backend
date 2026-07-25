import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Celette as an official-site zero-openings scraper', () => {
  const catalog = getScraperCatalog()
  const celette = catalog.find((provider) => provider.source === 'celette')

  assert.ok(celette)
  assert.equal(celette.adapter, 'script')
  assert.equal(celette.atsPlatform, 'official-company-site')
  assert.equal(celette.companyCareerPage, 'https://www.celette.com/')
  assert.equal(celette.companyDomain, 'celette.com')
  assert.equal(celette.parser, 'custom-script')
  assert.match(celette.modulePath, /celette[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Celette script scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const celette = scrapers.find((scraper) => scraper.name === 'celette')

  assert.ok(celette)
  assert.equal(typeof celette.run, 'function')
  assert.equal(celette.provider.adapter, 'script')
  assert.equal(celette.provider.parser, 'custom-script')
  assert.equal(celette.provider.companyCareerPage, 'https://www.celette.com/')
})
