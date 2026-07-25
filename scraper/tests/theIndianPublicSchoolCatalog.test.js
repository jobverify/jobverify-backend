import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes The Indian Public School on the official careers handoff to Workday', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'theindianpublicschool')

  assert.ok(provider)
  assert.equal(provider.companyName, 'The Indian Public School (TIPS)')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyCareerPage, 'https://www.theindianpublicschool.org/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-page-plus-workday-next-button')
  assert.equal(
    provider.extractionStrategy,
    'official-careers-handoff+workday-search-results+workday-detail-pages',
  )
  assert.equal(provider.parser, 'workday')
  assert.equal(provider.companyDomain, 'theindianpublicschool.org')
  assert.match(provider.modulePath, /theindianpublicschool[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve The Indian Public School (TIPS) to the theindianpublicschool source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'theindianpublicschool')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /theindianpublicschool[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'theindianpublicschool')

  const report = generateCompanyCoverageReport({
    csvText: 'The Indian Public School (TIPS),\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['The Indian Public School (TIPS)', 'theindianpublicschool', 'The Indian Public School (TIPS)']],
  )
})
