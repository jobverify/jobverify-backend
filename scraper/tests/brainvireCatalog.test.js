import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Brainvire on the official first-party careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'brainvire')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Brainvire')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.brainvire.com/careers/')
  assert.equal(provider.companyDomain, 'brainvire.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(provider.extractionStrategy, 'verified-careers-page+inline-role-cards+same-page-apply')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /brainvire[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Brainvire without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'brainvire')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /brainvire[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'brainvire')

  const report = generateCompanyCoverageReport({
    csvText: 'Brainvire,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
