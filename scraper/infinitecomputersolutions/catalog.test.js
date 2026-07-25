import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Infinite Computer Solutions as an official careers invalid-portal scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'infinitecomputersolutions')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Infinite Computer Solutions')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'brassring')
  assert.equal(provider.companyCareerPage, 'https://www.infinite.com/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.companyDomain, 'infinite.com')
  assert.match(provider.modulePath, /infinitecomputersolutions[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Infinite Computer Solutions without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'infinitecomputersolutions')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /infinitecomputersolutions[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'infinitecomputersolutions')

  const report = generateCompanyCoverageReport({
    csvText: 'Infinite Computer Solutions,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Infinite Computer Solutions', 'infinitecomputersolutions', 'Infinite Computer Solutions']],
  )
})
