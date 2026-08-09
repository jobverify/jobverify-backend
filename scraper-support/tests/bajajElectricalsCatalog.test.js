import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Bajaj Electricals on the verified official page backed by Darwinbox', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajelectricals')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Bajaj Electricals')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://www.bajajelectricals.com/pages/careers')
  assert.equal(provider.companyDomain, 'bajajelectricals.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-careers-page-plus-darwinbox-jobs-portal')
  assert.equal(provider.extractionStrategy, 'official-careers-page+darwinbox-public-jobs-portal')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /bajajelectricals[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Bajaj Electricals without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bajajelectricals')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /bajajelectricals[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'bajajelectricals')

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Electricals,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
