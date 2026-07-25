import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Havells Oracle Cloud script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'havells')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.match(provider.companyCareerPage, /iabgcp\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/jobs/i)
  assert.equal(provider.companyDomain, 'iabgcp.fa.ocs.oraclecloud.com')
})

test('buildScrapers exposes a runnable Havells scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'havells')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /havells[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'havells')
})
