import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the IDFC FIRST Bank provider with the official careers microsite metadata', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'idfcfirstbank')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyName, 'IDFC FIRST Bank')
  assert.equal(provider.companyCareerPage, 'https://careers.idfcfirst.bank.in/')
})

test('buildScrapers exposes a runnable IDFC FIRST Bank scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'idfcfirstbank')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /idfcfirstbank[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'idfcfirstbank')
})

test('company coverage resolves IDFC First Bank to the idfcfirstbank source without aliases', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'IDFC First Bank,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['IDFC First Bank', 'idfcfirstbank', 'IDFC FIRST Bank']],
  )
})
