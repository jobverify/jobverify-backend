import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Greenko Hub as a homepage-verified Darwinbox script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'greenkohub')

  assert.ok(provider, 'Expected Greenko Hub provider to be registered in customProviders.json')
  assert.equal(provider.companyName, 'Greenko Hub')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://www.greenkogroup.com/')
  assert.equal(provider.companyDomain, 'greenkogroup.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'verified-official-homepage-link+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /greenkohub[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Greenko Hub without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'greenkohub')

  assert.ok(scraper, 'Expected buildScrapers() to return the Greenko Hub scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /greenkohub[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'greenkohub')

  const report = generateCompanyCoverageReport({
    csvText: 'Greenko Hub,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Greenko Hub', 'greenkohub', 'Greenko Hub']],
  )
})
