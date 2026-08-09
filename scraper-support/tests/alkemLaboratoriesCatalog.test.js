import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Alkem Laboratories as a broken first-party careers handoff monitor', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'alkemlaboratories')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Alkem Laboratories')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.alkemlabs.com/career')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-page-plus-unreachable-careers-handoff-monitor')
  assert.equal(provider.extractionStrategy, 'official-careers-page+broken-careers-host-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'alkemlabs.com')
  assert.match(provider.modulePath, /alkemlaboratories[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Alkem Laboratories to alkemlaboratories', () => {
  const scraper = buildScrapers().find((item) => item.name === 'alkemlaboratories')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /alkemlaboratories[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'alkemlaboratories')

  const report = generateCompanyCoverageReport({
    csvText: 'Alkem Laboratories,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Alkem Laboratories', 'alkemlaboratories', 'Alkem Laboratories']],
  )
})
