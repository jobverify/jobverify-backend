import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Tata Communications custom script provider with Spire2Grow metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'tatacommunications')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Tata Communications')
  assert.equal(provider.companyCareerPage, 'https://jobs.tatacommunications.com/')
  assert.equal(provider.atsPlatform, 'spire2grow')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'paginated-public-json-api')
  assert.equal(provider.extractionStrategy, 'workspace-bootstrap+requisition-search+detail-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'tatacommunications.com')
  assert.equal(provider.workspaceDomain, 'jobs.tatacommunications.com')
  assert.equal(provider.workspaceId, 'TCLPROD-c62po')
  assert.equal(provider.apiBase, 'https://io.spire2grow.com/ies/v1/p')
  assert.match(provider.modulePath, /[\\/]tatacommunications[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Tata Communications scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'tatacommunications')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /tatacommunications[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'tatacommunications')
  assert.equal(scraper.provider.atsPlatform, 'spire2grow')
  assert.equal(scraper.provider.workspaceId, 'TCLPROD-c62po')
})
