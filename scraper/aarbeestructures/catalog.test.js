import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Aarbee Structures is registered against its official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'aarbeestructures')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Aarbee Structures Pvt. Ltd.')
  assert.equal(provider.companyCareerPage, 'https://aarbeestructures.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyDomain, 'aarbeestructures.com')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page-plus-no-public-listings',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /aarbeestructures[\\/]script\.js$/i)
})

test('Aarbee Structures is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'aarbeestructures')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /aarbeestructures[\\/]jobs\.json$/)
})
