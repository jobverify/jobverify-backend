import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Cummins India on the official public jobs portal', () => {
  const cummins = getScraperCatalog().find((provider) => provider.source === 'cumminsindia')

  assert.ok(cummins)
  assert.equal(cummins.adapter, 'script')
  assert.equal(cummins.atsPlatform, 'jobsyn-solr')
  assert.equal(cummins.countryFilter, 'India')
  assert.equal(cummins.companyCareerPage, 'https://cummins.jobs/jobs/')
  assert.equal(cummins.companyDomain, 'cummins.jobs')
  assert.match(cummins.modulePath, /cumminsindia[\\/]script\.js$/)
})

test('buildScrapers exposes a runnable Cummins India scraper', () => {
  const cummins = buildScrapers().find((scraper) => scraper.name === 'cumminsindia')

  assert.ok(cummins)
  assert.equal(typeof cummins.run, 'function')
  assert.match(cummins.dryRunFile, /cumminsindia[\\/]jobs\.json$/)
})
