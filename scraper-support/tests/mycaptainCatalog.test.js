import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('MyCaptain is registered as a verified first-party careers scraper without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mycaptain')

  assert.ok(provider, 'Expected MyCaptain provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'MyCaptain')
  assert.equal(provider.companyCareerPage, 'https://mycaptain.in/career')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-careers-page+inline-job-cards',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'mycaptain.in')
  assert.match(provider.modulePath, /mycaptain[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Mycaptain'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'MyCaptain'), false)
})

test('MyCaptain matches coverage directly from the exact CSV row and is runnable via buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Mycaptain,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Mycaptain', 'mycaptain', 'MyCaptain']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'mycaptain')

  assert.ok(scraper, 'Expected buildScrapers() to return the MyCaptain scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'mycaptain')
  assert.equal(scraper.provider.companyCareerPage, 'https://mycaptain.in/career')
  assert.match(scraper.dryRunFile, /mycaptain[\\/]jobs\.json$/i)
})
