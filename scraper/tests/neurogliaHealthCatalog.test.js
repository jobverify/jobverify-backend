import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Neuroglia Health is registered as a verified first-party careers scraper without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'neurogliahealth')

  assert.ok(provider, 'Expected Neuroglia Health provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Neuroglia Health Pvt Ltd')
  assert.equal(provider.companyCareerPage, 'https://dailyrounds.org/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-careers-pages-plus-first-party-json-apis')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-careers-pages+first-party-listing-apis+first-party-detail-apis',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'neurogliahealth.com')
  assert.match(provider.modulePath, /neurogliahealth[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Neuroglia Health Pvt Ltd'), false)
})

test('Neuroglia Health matches coverage directly from provider metadata and is runnable via buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Neuroglia Health Pvt Ltd,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Neuroglia Health Pvt Ltd', 'neurogliahealth', 'Neuroglia Health Pvt Ltd']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'neurogliahealth')

  assert.ok(scraper, 'Expected buildScrapers() to return the Neuroglia Health scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'neurogliahealth')
  assert.equal(scraper.provider.companyCareerPage, 'https://dailyrounds.org/careers')
  assert.match(scraper.dryRunFile, /neurogliahealth[\\/]jobs\.json$/i)
})
