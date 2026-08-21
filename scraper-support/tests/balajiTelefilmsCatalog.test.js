import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Balaji Telefilms as the Thursday, August 13, 2026 Incapsula-blocked first-party careers surface', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'balajitelefilms')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Balaji Telefilms')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.balajitelefilms.com/career-opportunity.php')
  assert.equal(provider.companyDomain, 'balajitelefilms.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-career-opportunity-php-with-incapsula-block-shell-fallback')
  assert.equal(provider.extractionStrategy, 'verified-official-homepage+verified-email-only-careers-page-or-incapsula-block-shell+empty-result')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.verifiedOn, '2026-08-13')
  assert.match(provider.verifiedSurfaceSummary, /Thursday, August 13, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /_Incapsula_Resource/i)
  assert.match(provider.verifiedSurfaceSummary, /career-opportunity\.php/i)
  assert.match(provider.modulePath, /balajitelefilms[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Balaji Telefilms without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'balajitelefilms')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /balajitelefilms[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'balajitelefilms')

  const report = generateCompanyCoverageReport({
    csvText: 'Balaji Telefilms,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
