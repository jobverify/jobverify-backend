import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Ujjivan as an official first-party apiPortal provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ujjivan')

  assert.ok(provider)
  assert.equal(provider.adapter, 'apiPortal')
  assert.equal(provider.companyName, 'Ujjivan')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.ujjivansfb.bank.in/careers-home/explore-jobs')
  assert.equal(provider.companyDomain, 'ujjivansfb.bank.in')
  assert.equal(provider.config.discovery.listingApiUrl, 'https://www.ujjivansfb.bank.in/api/jobs')
  assert.deepEqual(provider.config.pagination, {
    strategy: 'single-page',
    resultsPath: 'data',
    totalCountPath: 'count',
  })
  assert.deepEqual(provider.config.mapping.location, [
    'location_city.0',
    'location_city.1',
    'location_city.2',
    'location_city.3',
  ])
})

test('buildScrapers and company coverage resolve Ujjivan to a runnable apiPortal source', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Ujjivan,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Ujjivan', 'ujjivan', 'Ujjivan']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'ujjivan')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /ujjivan[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'ujjivan')
  assert.equal(scraper.provider.adapter, 'apiPortal')
})
