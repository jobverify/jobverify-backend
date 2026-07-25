import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes GoComet as a Keka embed script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'gocomet')

  assert.ok(provider)
  assert.equal(provider.companyName, 'GoComet')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'keka-embed-api')
  assert.equal(provider.companyCareerPage, 'https://www.gocomet.com/company/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-keka-active-jobs-endpoint')
  assert.equal(provider.extractionStrategy, 'official-careers-page+keka-embed-api+jobdetails+applyjob')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'gocomet.com')
  assert.match(provider.modulePath, /gocomet[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve GoComet to the gocomet source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'gocomet')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /gocomet[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'gocomet')

  const report = generateCompanyCoverageReport({
    csvText: 'GoComet,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['GoComet', 'gocomet', 'GoComet']],
  )
})
