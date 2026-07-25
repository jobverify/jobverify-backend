import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Engineers India Limited as an official recruitment portal scraper', () => {
  const catalog = getScraperCatalog()
  const eil = catalog.find((provider) => provider.source === 'engineersindialimited')

  assert.ok(eil)
  assert.equal(eil.adapter, 'script')
  assert.equal(eil.atsPlatform, 'official-company-careers')
  assert.equal(eil.companyCareerPage, 'https://recruitment.eil.co.in/')
  assert.equal(eil.companyDomain, 'recruitment.eil.co.in')
  assert.equal(eil.parser, 'custom-script')
  assert.match(eil.modulePath, /engineersindialimited[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Engineers India Limited script scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const eil = scrapers.find((scraper) => scraper.name === 'engineersindialimited')

  assert.ok(eil)
  assert.equal(typeof eil.run, 'function')
  assert.equal(eil.provider.adapter, 'script')
  assert.equal(eil.provider.parser, 'custom-script')
  assert.equal(eil.provider.companyCareerPage, 'https://recruitment.eil.co.in/')
})
