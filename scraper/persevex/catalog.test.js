import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Persevex is registered with the verified first-party careers page and direct CSV company match', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'persevex')

  assert.ok(provider, 'Expected Persevex provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Persevex')
  assert.equal(provider.companyCareerPage, 'https://www.persevex.com/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(provider.extractionStrategy, 'verified-first-party-careers-page+server-rendered-role-cards')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'persevex.com')
  assert.match(provider.modulePath, /persevex[\\/]script\.js$/i)
})

test('PERSEVEX matches company coverage through direct normalization', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'PERSEVEX,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['PERSEVEX', 'persevex', 'Persevex']],
  )
})

test('Persevex is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'persevex')

  assert.ok(scraper, 'Expected buildScrapers() to return the Persevex scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'persevex')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.persevex.com/careers')
  assert.match(scraper.dryRunFile, /persevex[\\/]jobs\.json$/i)
})
