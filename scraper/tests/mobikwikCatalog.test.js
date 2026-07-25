import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes MobiKwik as an official careers external-handoff scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mobikwik')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyName, 'MobiKwik')
  assert.equal(provider.companyCareerPage, 'https://www.mobikwik.com/careers')
  assert.equal(provider.companyDomain, 'mobikwik.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /mobikwik[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable MobiKwik scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'mobikwik')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.adapter, 'script')
  assert.equal(scraper.provider.parser, 'custom-script')
  assert.match(scraper.dryRunFile, /mobikwik[\\/]jobs\.json$/)
})

test('generateCompanyCoverageReport resolves MobiKwik to the MobiKwik provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'MobiKwik,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['MobiKwik', 'mobikwik', 'MobiKwik']],
  )
})
