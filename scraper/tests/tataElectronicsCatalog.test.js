import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Tata Electronics as a SuccessFactors jobs2web script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'tataelectronics')

  assert.ok(provider)
  assert.equal(provider.companyName, 'TATA Electronics Private Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.companyCareerPage, 'https://careers.tataelectronics.com/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'startrow-query')
  assert.equal(provider.extractionStrategy, 'successfactors-search-page+detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.tataelectronics.com')
  assert.match(provider.modulePath, /tataelectronics[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Tata Electronics Pvt Ltd to the tataelectronics source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'tataelectronics')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /tataelectronics[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'tataelectronics')

  const report = generateCompanyCoverageReport({
    csvText: 'Tata Electronics Pvt Ltd,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Tata Electronics Pvt Ltd', 'tataelectronics', 'TATA Electronics Private Limited']],
  )
})
