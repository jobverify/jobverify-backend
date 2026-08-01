import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Vodafone Idea Limited as a SuccessFactors jobs2web script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'vodafoneidea')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Vodafone Idea Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.companyCareerPage, 'https://careers.vodafoneidea.com/go/All-Current-Job-Opportunities/4268701/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'jobs2web-category-page-query')
  assert.equal(provider.extractionStrategy, 'jobs2web-listing-rows+detail-pages+talentcommunity-apply-handoff')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.vodafoneidea.com')
  assert.match(provider.modulePath, /vodafoneidea[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Vodafone Idea Limited to the vodafoneidea source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'vodafoneidea')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /vodafoneidea[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'vodafoneidea')

  const report = generateCompanyCoverageReport({
    csvText: 'Vodafone Idea Limited,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Vodafone Idea Limited', 'vodafoneidea', 'Vodafone Idea Limited']],
  )
})
