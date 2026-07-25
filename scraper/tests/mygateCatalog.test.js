import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes MyGate as an official-site Darwinbox script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mygate')

  assert.ok(provider)
  assert.equal(provider.companyName, 'MyGate')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyCareerPage, 'https://mygate.com/careers/')
  assert.equal(provider.companyDomain, 'mygate.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'darwinbox-alljobs-api-via-hosted-origin')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /mygate[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve MyGate to the mygate source without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'mygate')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /mygate[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'mygate')

  const report = generateCompanyCoverageReport({
    csvText: 'MyGate,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['MyGate', 'mygate', 'MyGate']],
  )
})
