import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Simplilearn as an official WP Job Openings script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'simplilearn')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Simplilearn')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'wp-job-openings')
  assert.equal(provider.companyCareerPage, 'https://www.simplilearn.com/job-openings')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'wp-json-page-query')
  assert.equal(provider.extractionStrategy, 'official-careers-page+awsm-rest-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'simplilearn.com')
  assert.match(provider.modulePath, /simplilearn[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Simplilearn to the simplilearn source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'simplilearn')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /simplilearn[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'simplilearn')

  const report = generateCompanyCoverageReport({
    csvText: 'Simplilearn,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Simplilearn', 'simplilearn', 'Simplilearn']],
  )
})
