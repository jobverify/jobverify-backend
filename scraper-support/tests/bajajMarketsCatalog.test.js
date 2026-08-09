import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Bajaj Markets on the verified official page backed by Darwinbox', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajmarkets')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Bajaj Markets')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://www.bajajfinservmarkets.in/careers')
  assert.equal(provider.companyDomain, 'bajajfinservmarkets.in')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-careers-handoff-plus-darwinbox-jobs-portal')
  assert.equal(provider.extractionStrategy, 'official-careers-handoff+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /bajajmarkets[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Bajaj Markets without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bajajmarkets')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /bajajmarkets[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'bajajmarkets')

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Markets,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
