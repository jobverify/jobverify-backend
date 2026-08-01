import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Tata Power as a SuccessFactors script provider on the official public careers board', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'tatapower')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Tata Power')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.companyCareerPage, 'https://careers.tatapower.com/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'startrow-query')
  assert.equal(provider.extractionStrategy, 'successfactors-search-page+detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.tatapower.com')
  assert.match(provider.modulePath, /tatapower[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Tata Power to the tatapower source without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'tatapower')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /tatapower[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'tatapower')

  const report = generateCompanyCoverageReport({
    csvText: 'Tata Power,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Tata Power', 'tatapower', 'Tata Power']],
  )
})
