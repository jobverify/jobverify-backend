import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Bajaj Housing Finance as a verified no-public-careers surface', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajhousingfinance')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Bajaj Housing Finance')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.companyCareerPage, 'https://www.bajajhousingfinance.in/')
  assert.equal(provider.companyDomain, 'bajajhousingfinance.in')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-sitemap-plus-common-careers-route-404-validation')
  assert.equal(provider.extractionStrategy, 'verified-homepage+verified-sitemap+verified-common-careers-routes-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /bajajhousingfinance[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Bajaj Housing Finance without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bajajhousingfinance')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /bajajhousingfinance[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'bajajhousingfinance')

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Housing Finance,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
