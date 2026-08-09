import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Coinbase as a verified first-party careers source', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'coinbase')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Coinbase')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'greenhouse')
  assert.equal(provider.companyCareerPage, 'https://www.coinbase.com/careers/positions')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page+detail-pages')
  assert.equal(provider.extractionStrategy, 'verified-first-party-positions-page+india-role-cards+first-party-detail-pages+greenhouse-apply-handoff')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'coinbase.com')
  assert.match(provider.modulePath, /coinbase[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Coinbase rows', () => {
  const scraper = buildScrapers().find((item) => item.name === 'coinbase')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /coinbase[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'coinbase')

  const report = generateCompanyCoverageReport({
    csvText: 'Coinbase,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Coinbase', 'coinbase', 'Coinbase']],
  )
})
