import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Biofourmis on the official careers page backed by Greenhouse', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'biofourmis')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Biofourmis')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'greenhouse')
  assert.equal(provider.companyCareerPage, 'https://biofourmis.com/about/job-openings')
  assert.equal(provider.companyDomain, 'biofourmis.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-careers-page-plus-greenhouse-loader-script')
  assert.equal(
    provider.extractionStrategy,
    'official-careers-page+verified-greenhouse-loader+greenhouse-jobs-api+detail-pages',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /biofourmis[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Biofourmis without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'biofourmis')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /biofourmis[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'biofourmis')

  const report = generateCompanyCoverageReport({
    csvText: 'Biofourmis,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
