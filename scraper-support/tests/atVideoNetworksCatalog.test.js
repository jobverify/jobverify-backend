import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes A&T Video Networks as a public careers-page scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'atvideonetworks')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site')
  assert.equal(provider.companyCareerPage, 'https://www.atnetindia.net/career/')
  assert.equal(provider.companyDomain, 'atnetindia.net')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /atvideonetworks[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable A&T Video Networks scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'atvideonetworks')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.parser, 'custom-script')
  assert.equal(provider.provider.companyCareerPage, 'https://www.atnetindia.net/career/')
})
