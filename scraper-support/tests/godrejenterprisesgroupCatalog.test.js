import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes Godrej Enterprises Group as an official careers public-openings scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'godrejenterprisesgroup')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.godrejenterprises.com/about-us/careers/openings/')
  assert.equal(provider.companyDomain, 'godrejenterprises.com')
  assert.equal(provider.paginationStrategy, 'single-public-openings-page')
  assert.equal(
    provider.extractionStrategy,
    'official-public-openings-page+html-job-table+first-party-detail-links',
  )
  assert.match(provider.modulePath, /godrejenterprisesgroup[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Godrej Enterprises Group scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'godrejenterprisesgroup')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.atsPlatform, 'official-company-careers')
  assert.match(provider.dryRunFile, /godrejenterprisesgroup[\\/]jobs\.json$/)
})

test('Godrej & Boyce maps to the verified Godrej Enterprises Group careers surface through aliases', () => {
  assert.equal(companyAliases['Godrej & Boyce'], 'godrejenterprisesgroup')

  const report = generateCompanyCoverageReport({
    csvText: 'Godrej & Boyce,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Godrej & Boyce', 'godrejenterprisesgroup', 'Godrej Enterprises Group']],
  )
})
