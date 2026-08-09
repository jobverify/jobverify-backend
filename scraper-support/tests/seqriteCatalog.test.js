import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('catalog exposes Seqrite as a runnable Darwinbox script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'seqrite')
  const scraper = buildScrapers().find((item) => item.name === 'seqrite')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Seqrite')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.companyCareerPage, 'https://www.quickheal.co.in/jobs-careers-at-quick-heal')
  assert.match(provider.modulePath, /seqrite[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /seqrite[\\/]jobs\.json$/i)
  assert.equal(typeof scraper.run, 'function')
})
