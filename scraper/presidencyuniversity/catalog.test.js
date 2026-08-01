import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Presidency University is registered against the official careers page and public HROne board', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'presidencyuniversity')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Presidency University')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'hrone')
  assert.equal(provider.companyCareerPage, 'https://presidencyuniversity.in/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-page-plus-hrone-show-more')
  assert.equal(
    provider.extractionStrategy,
    'official-careers-handoff+hrone-rendered-listings+captured-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'presidencyuniversity.in')
  assert.match(provider.modulePath, /presidencyuniversity[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Presidency University exactly', () => {
  const scraper = buildScrapers().find((item) => item.name === 'presidencyuniversity')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /presidencyuniversity[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'presidencyuniversity')

  const report = generateCompanyCoverageReport({
    csvText: 'Presidency University,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Presidency University', 'presidencyuniversity', 'Presidency University']],
  )
})
