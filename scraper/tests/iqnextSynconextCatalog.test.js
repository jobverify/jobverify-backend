import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('IQnext (Synconext) is registered as a verified first-party zero-job scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'iqnextsynconext')

  assert.ok(provider, 'Expected IQnext (Synconext) provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'IQnext (Synconext)')
  assert.equal(provider.companyCareerPage, 'https://www.synconext.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-common-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage-plus-missing-first-party-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'synconext.com')
  assert.match(provider.modulePath, /iqnextsynconext[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'IQnext (Synconext)'), false)
})

test('IQnext (Synconext) matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'IQnext (Synconext),\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['IQnext (Synconext)', 'iqnextsynconext', 'IQnext (Synconext)']],
  )
})

test('IQnext (Synconext) is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'iqnextsynconext')

  assert.ok(scraper, 'Expected buildScrapers() to return the IQnext (Synconext) scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'iqnextsynconext')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.synconext.com/')
  assert.match(scraper.dryRunFile, /iqnextsynconext[\\/]jobs\.json$/i)
})
