import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Adani Cement is registered against the official Adani careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'adanicement')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Adani Cement')
  assert.equal(provider.companyCareerPage, 'https://www.adani.com/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page-plus-cement-business-signal-dynamic-handoff-no-public-listings',
  )
  assert.equal(provider.companyDomain, 'adani.com')
  assert.match(provider.modulePath, /adanicement[\\/]script\.js$/i)
})

test('Adani Cement is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'adanicement')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /adanicement[\\/]jobs\.json$/)
})
