import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Tekion as a Greenhouse apiPortal provider linked from the official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'tekion')

  assert.ok(provider)
  assert.equal(provider.adapter, 'apiPortal')
  assert.equal(provider.atsPlatform, 'greenhouse')
  assert.equal(provider.companyCareerPage, 'https://www.tekion.com/job-openings')
  assert.equal(provider.companyDomain, 'tekion.com')
  assert.match(provider.config.discovery.listingApiUrl, /boards-api\.greenhouse\.io\/v1\/boards\/tekion\/jobs/i)
})

test('buildScrapers exposes a runnable Tekion apiPortal scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'tekion')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /tekion[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'tekion')
  assert.equal(scraper.provider.atsPlatform, 'greenhouse')
})
