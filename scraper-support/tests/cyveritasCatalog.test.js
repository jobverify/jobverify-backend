import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Cyveritas as an official-site zero-openings scraper', () => {
  const catalog = getScraperCatalog()
  const cyveritas = catalog.find((provider) => provider.source === 'cyveritas')

  assert.ok(cyveritas)
  assert.equal(cyveritas.adapter, 'script')
  assert.equal(cyveritas.atsPlatform, 'official-company-careers')
  assert.equal(cyveritas.companyCareerPage, 'https://cyveritas.com/careers')
  assert.equal(cyveritas.companyDomain, 'cyveritas.com')
  assert.equal(cyveritas.parser, 'custom-script')
  assert.match(cyveritas.modulePath, /cyveritas[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Cyveritas script scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const cyveritas = scrapers.find((scraper) => scraper.name === 'cyveritas')

  assert.ok(cyveritas)
  assert.equal(typeof cyveritas.run, 'function')
  assert.equal(cyveritas.provider.adapter, 'script')
  assert.equal(cyveritas.provider.parser, 'custom-script')
  assert.equal(cyveritas.provider.companyCareerPage, 'https://cyveritas.com/careers')
})
