import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Invences is registered against its official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'invences')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Invences')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://invences.com/career')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-table')
  assert.equal(provider.extractionStrategy, 'official-html-table+detail-pages')
  assert.equal(provider.countryFilter, 'United States')
  assert.equal(provider.companyDomain, 'invences.com')
  assert.match(provider.modulePath, /invences[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Invences scraper', () => {
  const scraper = buildScrapers().find((item) => item.name === 'invences')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /invences[\\/]jobs\.json$/)
})
