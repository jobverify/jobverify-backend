import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Elektrobit Automotive scraper with official metadata', () => {
  const catalog = getScraperCatalog()
  const elektrobit = catalog.find((provider) => provider.source === 'elektrobitautomotive')

  assert.ok(elektrobit)
  assert.equal(elektrobit.adapter, 'script')
  assert.equal(elektrobit.atsPlatform, 'official-company-careers')
  assert.match(elektrobit.companyCareerPage, /jobs\.elektrobit\.com/i)
  assert.equal(elektrobit.companyDomain, 'jobs.elektrobit.com')
})

test('buildScrapers exposes a runnable Elektrobit Automotive scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const elektrobit = scrapers.find((scraper) => scraper.name === 'elektrobitautomotive')

  assert.ok(elektrobit)
  assert.equal(typeof elektrobit.run, 'function')
  assert.match(elektrobit.dryRunFile, /elektrobitautomotive[\\/]jobs\.json$/)
  assert.equal(elektrobit.provider.source, 'elektrobitautomotive')
  assert.equal(elektrobit.provider.atsPlatform, 'official-company-careers')
})
