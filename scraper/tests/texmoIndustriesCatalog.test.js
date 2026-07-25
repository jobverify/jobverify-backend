import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Texmo Industries as an official company-filtered careers scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'texmoindustries')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Texmo Industries')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.texmo.com/careers/')
  assert.equal(provider.companyDomain, 'texmo.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'company-filter-form-post+page-number')
  assert.equal(
    provider.extractionStrategy,
    'official-careers-form+company-filter+html-job-cards+detail-pages+job-application-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /texmoindustries[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Texmo Industries scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'texmoindustries')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /texmoindustries[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'texmoindustries')
})
