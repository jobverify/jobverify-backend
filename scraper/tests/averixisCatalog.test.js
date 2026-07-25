import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Averixis Solutions as a bundle-backed script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'averixis')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Averixis Solutions')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://averixis.com/career')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-careers-page')
  assert.equal(provider.extractionStrategy, 'career-spa-bundle+shared-contact-apply')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'averixis.com')
  assert.match(provider.modulePath, /averixis[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Averixis Solutions to the averixis source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'averixis')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /averixis[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'averixis')

  const report = generateCompanyCoverageReport({
    csvText: 'Averixis Solutions,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Averixis Solutions', 'averixis', 'Averixis Solutions']],
  )
})
