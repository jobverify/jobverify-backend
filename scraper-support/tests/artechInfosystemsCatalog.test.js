import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Artech Infosystems as an Oracle Cloud scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'artechinfosystems')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.equal(provider.companyCareerPage, 'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs')
  assert.equal(provider.companyDomain, 'artech.com')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.scraperTimeoutMs, 600000)
  assert.match(provider.modulePath, /artechinfosystems[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Artech Infosystems scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'artechinfosystems')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.parser, 'custom-script')
  assert.equal(provider.provider.companyCareerPage, 'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs')
})
