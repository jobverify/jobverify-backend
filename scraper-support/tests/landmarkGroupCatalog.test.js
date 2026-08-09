import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Landmark Group as an Oracle Cloud script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'landmarkgroup')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Landmark Group')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.equal(provider.companyCareerPage, 'https://www.landmarkgroup.com/int/en/careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'offset-query')
  assert.equal(provider.extractionStrategy, 'official-careers-handoff+oracle-cloud-finder-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'efhi.fa.em3.oraclecloud.com')
  assert.match(provider.modulePath, /landmarkgroup[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Landmark Group to the landmarkgroup source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'landmarkgroup')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /landmarkgroup[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'landmarkgroup')

  const report = generateCompanyCoverageReport({
    csvText: 'Landmark Group,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Landmark Group', 'landmarkgroup', 'Landmark Group']],
  )
})
