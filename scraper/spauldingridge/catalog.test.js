import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Spaulding Ridge is registered against its official careers surface', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'spauldingridge')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Spaulding Ridge')
  assert.equal(provider.companyCareerPage, 'https://spauldingridge.com/about-us/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.paginationStrategy, 'official-careers-page-plus-open-positions-shell')
  assert.equal(
    provider.extractionStrategy,
    'official-careers-handoff+verified-open-positions-shell-no-public-job-board',
  )
  assert.equal(provider.companyDomain, 'spauldingridge.com')
  assert.match(provider.modulePath, /spauldingridge[\\/]script\.js$/i)
})

test('Spaulding Ridge is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'spauldingridge')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /spauldingridge[\\/]jobs\.json$/)
})
