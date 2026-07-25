import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Doppio as a first-party vacancies-feed script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'doppio')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Doppio')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-jobs-blog')
  assert.equal(provider.companyCareerPage, 'https://www.doppio-espresso.nl/category/vacatures/')
  assert.equal(provider.countryFilter, 'Netherlands')
  assert.equal(provider.paginationStrategy, 'wp-json-category-posts-single-page')
  assert.equal(
    provider.extractionStrategy,
    'official-vacatures-category+wp-json-posts-feed+first-party-careers-apply-handoff',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'doppio-espresso.nl')
  assert.match(provider.modulePath, /doppio[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Doppio to the doppio source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'doppio')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /doppio[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'doppio')

  const report = generateCompanyCoverageReport({
    csvText: 'Doppio,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Doppio', 'doppio', 'Doppio']],
  )
})
