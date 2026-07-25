import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('AdvaRisk is registered against its official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'advarisk')

  assert.ok(provider)
  assert.equal(provider.companyName, 'AdvaRisk')
  assert.equal(provider.companyCareerPage, 'https://advarisk.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.paginationStrategy, 'single-official-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page-plus-no-public-listings',
  )
  assert.equal(provider.companyDomain, 'advarisk.com')
  assert.match(provider.modulePath, /advarisk[\\/]script\.js$/i)
})

test('AdvaRisk is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'advarisk')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /advarisk[\\/]jobs\.json$/)
})
