import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Airbound as an Ashby script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'airbound')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Airbound')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'ashby')
  assert.equal(provider.companyCareerPage, 'https://www.airbound.com/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'ashby-public-board-pagination')
  assert.equal(provider.extractionStrategy, 'public-ashby-board-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'airbound.com')
  assert.match(provider.modulePath, /airbound[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Airbound to the airbound source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'airbound')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /airbound[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'airbound')

  const report = generateCompanyCoverageReport({
    csvText: 'Airbound,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Airbound', 'airbound', 'Airbound']],
  )
})
