import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Kantar as an apiPortal provider backed by the official Kantar careers API', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'kantar')

  assert.ok(provider)
  assert.equal(provider.adapter, 'apiPortal')
  assert.equal(provider.atsPlatform, 'kantar-careers-api+workday-handoff')
  assert.equal(provider.companyCareerPage, 'https://careers.kantar.com/job-search')
  assert.equal(provider.companyDomain, 'careers.kantar.com')
  assert.match(provider.config.discovery.listingApiUrl, /careers\.kantar\.com\/api\/careers\/GetJobs/i)
  assert.equal(provider.config.pagination.resultsPath, 'Report_Entry')
})

test('buildScrapers exposes a runnable Kantar apiPortal scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'kantar')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /kantar[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'kantar')
  assert.equal(scraper.provider.atsPlatform, 'kantar-careers-api+workday-handoff')
})
