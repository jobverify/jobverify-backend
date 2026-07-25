import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes The Sanmar Group (Sanmar Engineering) as an official careers ajax scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'sanmarengineering')

  assert.ok(provider)
  assert.equal(provider.companyName, 'The Sanmar Group (Sanmar Engineering)')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.sanmargroup.com/working-at-sanmar/opportunities/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-page-plus-wordpress-filter-ajax-per-business-area')
  assert.equal(
    provider.extractionStrategy,
    'official-careers-page+first-party-filter-ajax+engineering-business-area-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'sanmargroup.com')
  assert.match(provider.modulePath, /sanmarengineering[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'The Sanmar Group (Sanmar Engineering)'), false)
})

test('buildScrapers and company coverage resolve The Sanmar Group (Sanmar Engineering) without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sanmarengineering')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'sanmarengineering')
  assert.match(scraper.dryRunFile, /sanmarengineering[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,The Sanmar Group (Sanmar Engineering)\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['The Sanmar Group (Sanmar Engineering)', 'sanmarengineering', 'The Sanmar Group (Sanmar Engineering)']],
  )
  assert.equal(report.unmatchedCount, 0)
})
