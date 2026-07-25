import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes ABB on the official ABB careers page backed by Workday', () => {
  const catalog = getScraperCatalog()
  const abb = catalog.find((provider) => provider.source === 'abb')

  assert.ok(abb)
  assert.equal(abb.adapter, 'workday')
  assert.equal(abb.atsPlatform, 'workday')
  assert.match(abb.companyCareerPage, /careers\.abb\/global\/en\/search-results/i)
  assert.equal(abb.companyDomain, 'careers.abb')
  assert.match(abb.baseUrl, /abb\.wd3\.myworkdayjobs\.com\/External_Career_Page/i)
})

test('buildScrapers exposes a runnable ABB Workday scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const abb = scrapers.find((scraper) => scraper.name === 'abb')

  assert.ok(abb)
  assert.equal(typeof abb.run, 'function')
  assert.match(abb.dryRunFile, /myworkday[\\/]abb[\\/]jobs\.json$/)
  assert.equal(abb.provider.source, 'abb')
  assert.equal(abb.provider.atsPlatform, 'workday')
})
