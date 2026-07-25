import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Vehant Technologies as an official careers-page scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'vehanttechnologies')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Vehant Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.vehant.com/careers/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-page-plus-wordpress-load-more')
  assert.equal(provider.extractionStrategy, 'official-careers-page+load-more-ajax+detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'vehant.com')
  assert.match(provider.modulePath, /vehanttechnologies[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve the exact Vehant Technologies name without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'vehanttechnologies')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /vehanttechnologies[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'vehanttechnologies')

  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Vehant Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.source ?? null]),
    [['Vehant Technologies', 'vehanttechnologies', 'vehanttechnologies']],
  )
  assert.equal(report.unmatchedCount, 0)
})
