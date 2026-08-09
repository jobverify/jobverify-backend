import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Wabtec Corporation as an India-localized Attrax script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'wabtec')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Wabtec Corporation')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'smartrecruiters-attrax')
  assert.equal(provider.companyCareerPage, 'https://careers.wabtec.com/in/jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'page-query')
  assert.equal(provider.extractionStrategy, 'attrax-html-cards+detail-page-workflow-apply')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.wabtec.com')
  assert.match(provider.modulePath, /wabtec[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Wabtec Corporation to the wabtec source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'wabtec')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /wabtec[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'wabtec')

  const report = generateCompanyCoverageReport({
    csvText: 'Wabtec Corporation,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Wabtec Corporation', 'wabtec', 'Wabtec Corporation']],
  )
})
