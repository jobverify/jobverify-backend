import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes BlackBuck as an email-only first-party careers source', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'blackbuck')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers-nonlisting')
  assert.equal(provider.companyName, 'BlackBuck')
  assert.equal(provider.companyCareerPage, 'https://blackbuck.com/team-blackbuck.html')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-team-page-plus-broken-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-plus-email-only-team-page-plus-broken-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'blackbuck.com')
  assert.match(provider.modulePath, /blackbuck[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve BlackBuck to blackbuck', () => {
  const scraper = buildScrapers().find((item) => item.name === 'blackbuck')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'blackbuck')
  assert.match(scraper.dryRunFile, /blackbuck[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'BlackBuck,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.source ?? null]),
    [['BlackBuck', 'blackbuck', 'blackbuck']],
  )
})
