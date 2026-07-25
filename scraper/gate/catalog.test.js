import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Gate is registered through the custom provider catalog without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'gate')

  assert.ok(provider, 'Expected Gate provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Gate')
  assert.equal(provider.companyCareerPage, 'https://www.gate.com/careers')
  assert.equal(provider.atsPlatform, 'lever')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'official-careers-validation-plus-lever-api')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-lever-board+lever-postings-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'gate.com')
  assert.match(provider.modulePath, /gate[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Gate'), false)
})

test('Gate matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Gate\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Gate', 'gate', 'Gate']],
  )
})

test('Gate is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'gate')

  assert.ok(scraper, 'Expected buildScrapers() to return the Gate scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'gate')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.gate.com/careers')
  assert.match(scraper.dryRunFile, /gate[\\/]jobs\.json$/i)
})
