import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes Data Design as a first-party tj_job script provider without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'datadesign')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Data Design')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'wordpress-jobs-api')
  assert.equal(provider.companyCareerPage, 'https://recruit.datadesign.co.jp/jobs')
  assert.equal(provider.countryFilter, 'Japan')
  assert.equal(provider.paginationStrategy, 'wp-json-page-query')
  assert.equal(provider.extractionStrategy, 'official-homepage+official-jobs-page+wp-json-tj_job-feed')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'datadesign.co.jp')
  assert.match(provider.modulePath, /datadesign[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Data Design'), false)
})

test('buildScrapers and company coverage resolve Data Design directly from provider metadata', () => {
  const scraper = buildScrapers().find((item) => item.name === 'datadesign')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /datadesign[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'datadesign')

  const report = generateCompanyCoverageReport({
    csvText: 'Data Design,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Data Design', 'datadesign', 'Data Design']],
  )
})
