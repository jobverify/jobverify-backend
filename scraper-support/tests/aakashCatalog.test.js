import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Aakash scraper with Hono careers metadata', () => {
  const catalog = getScraperCatalog()
  const aakash = catalog.find((provider) => provider.source === 'aakash')

  assert.ok(aakash)
  assert.equal(aakash.adapter, 'script')
  assert.equal(aakash.atsPlatform, 'hono-careers-api')
  assert.match(aakash.companyCareerPage, /hrconnect\.hono\.ai\/react\/career\/jobs/i)
  assert.equal(aakash.companyDomain, 'aakash.ac.in')
})

test('buildScrapers exposes a runnable Aakash scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const aakash = scrapers.find((scraper) => scraper.name === 'aakash')

  assert.ok(aakash)
  assert.equal(typeof aakash.run, 'function')
  assert.match(aakash.dryRunFile, /aakash[\\/]jobs\.json$/)
  assert.equal(aakash.provider.source, 'aakash')
  assert.equal(aakash.provider.adapter, 'script')
})

test('generateCompanyCoverageReport resolves Aakash Educational Services and Akash Institute to the Aakash scraper', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Aakash Educational Services,\nAkash Institute,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [
      item.companyName,
      item.source,
      item.provider?.companyName ?? null,
    ]),
    [
      ['Aakash Educational Services', 'aakash', 'Aakash'],
      ['Akash Institute', 'aakash', 'Aakash'],
    ],
  )
})
