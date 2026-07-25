import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Annapurna Finance as a verified resume-form sentinel source', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'annapurnafinance')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Annapurna Finance')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://annapurnafinance.in/career-openings/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(provider.extractionStrategy, 'verified-resume-form-careers-page-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'annapurnafinance.in')
  assert.match(provider.modulePath, /annapurnafinance[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Annapurna Finance to annapurnafinance', () => {
  const scraper = buildScrapers().find((item) => item.name === 'annapurnafinance')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /annapurnafinance[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'annapurnafinance')

  const report = generateCompanyCoverageReport({
    csvText: 'Annapurna Finance,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Annapurna Finance', 'annapurnafinance', 'Annapurna Finance']],
  )
})
