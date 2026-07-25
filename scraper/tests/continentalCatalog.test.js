import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Continental with official public portal metadata', () => {
  const continental = getScraperCatalog().find((provider) => provider.source === 'continental')

  assert.ok(continental)
  assert.equal(continental.adapter, 'script')
  assert.equal(continental.atsPlatform, 'continental-job-portal-api')
  assert.equal(continental.countryFilter, 'India')
  assert.equal(continental.companyCareerPage, 'https://jobs.continental.com/en/')
  assert.equal(continental.companyDomain, 'jobs.continental.com')
  assert.match(continental.modulePath, /continental[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Continental scraper', () => {
  const continental = buildScrapers().find((scraper) => scraper.name === 'continental')

  assert.ok(continental)
  assert.equal(typeof continental.run, 'function')
  assert.match(continental.dryRunFile, /continental[\\/]jobs\.json$/)
})
