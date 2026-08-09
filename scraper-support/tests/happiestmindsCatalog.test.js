import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes the Happiest Minds Darwinbox-backed script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const happiestminds = catalog.find((provider) => provider.source === 'happiestminds')

  assert.ok(happiestminds)
  assert.equal(happiestminds.adapter, 'script')
  assert.equal(happiestminds.atsPlatform, 'darwinbox')
  assert.match(happiestminds.companyCareerPage, /happiestminds\.com\/careers/i)
  assert.equal(happiestminds.companyDomain, 'happiestminds.com')
  assert.equal(happiestminds.parser, 'custom-script')
  assert.match(happiestminds.modulePath, /happiestminds[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Happiest Minds script scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const happiestminds = scrapers.find((scraper) => scraper.name === 'happiestminds')

  assert.ok(happiestminds)
  assert.equal(typeof happiestminds.run, 'function')
  assert.equal(happiestminds.provider.adapter, 'script')
  assert.equal(happiestminds.provider.parser, 'custom-script')
  assert.match(happiestminds.provider.companyCareerPage, /happiestminds\.com\/careers/i)
})
