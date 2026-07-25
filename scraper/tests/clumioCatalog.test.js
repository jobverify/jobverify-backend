import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Clumio as a verified Commvault-backed first-party Greenhouse source', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'clumio')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Clumio')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'greenhouse')
  assert.equal(provider.companyCareerPage, 'https://www.commvault.com/careers/jobs')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'verified-commvault-first-party-inline-greenhouse-list')
  assert.equal(provider.extractionStrategy, 'verified-commvault-greenhouse-list-plus-first-party-detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'clumio.com')
  assert.match(provider.modulePath, /clumio[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Clumio rows', () => {
  const scraper = buildScrapers().find((item) => item.name === 'clumio')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /clumio[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'clumio')

  const report = generateCompanyCoverageReport({
    csvText: 'Clumio,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Clumio', 'clumio', 'Clumio']],
  )
})
