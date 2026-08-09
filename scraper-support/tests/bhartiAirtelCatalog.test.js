import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Bharti Airtel as a Darwinbox script provider with verified official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bhartiairtel')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Bharti Airtel')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://careers.airtel.com/')
  assert.equal(provider.companyDomain, 'careers.airtel.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'official-careers-page+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /bhartiairtel[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Bharti Airtel to bhartiairtel', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bhartiairtel')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /bhartiairtel[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'bhartiairtel')

  const report = generateCompanyCoverageReport({
    csvText: 'Bharti Airtel,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bharti Airtel', 'bhartiairtel', 'Bharti Airtel']],
  )
})
