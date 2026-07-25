import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Infinity Learn is registered as a verified first-party zero-job scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'infinitylearn')

  assert.ok(provider, 'Expected Infinity Learn provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Infinity Learn')
  assert.equal(provider.companyCareerPage, 'https://infinitylearn.com/career')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-homepage-plus-career-page-plus-missing-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-generic-career-shell+verified-missing-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'infinitylearn.com')
  assert.match(provider.modulePath, /infinitylearn[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Infinity Learn'), false)
})

test('Infinity Learn matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Infinity Learn,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Infinity Learn', 'infinitylearn', 'Infinity Learn']],
  )
})

test('Infinity Learn is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'infinitylearn')

  assert.ok(scraper, 'Expected buildScrapers() to return the Infinity Learn scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'infinitylearn')
  assert.equal(scraper.provider.companyCareerPage, 'https://infinitylearn.com/career')
  assert.match(scraper.dryRunFile, /infinitylearn[\\/]jobs\.json$/i)
})
