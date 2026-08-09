import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Bikayi as a verified redirected careers page without a public ATS', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bikayi')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.companyName, 'Bikayi')
  assert.equal(provider.companyCareerPage, 'https://bikayi.com/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-redirect-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-plus-redirected-careers-page-without-stable-public-job-links-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'bikayi.com')
  assert.match(provider.modulePath, /bikayi[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Bikayi to bikayi', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bikayi')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'bikayi')
  assert.match(scraper.dryRunFile, /bikayi[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Bikayi,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.source ?? null]),
    [['Bikayi', 'bikayi', 'bikayi']],
  )
})
