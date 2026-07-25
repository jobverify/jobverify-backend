import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('WTT International Private Limited is registered as a parked-and-unresolved first-party sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'wttinternationalprivatelimited')

  assert.ok(provider, 'Expected WTT International Private Limited provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'WTT International Private Limited')
  assert.equal(provider.companyCareerPage, 'https://wttinternational.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-unresolved')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'parked-first-party-routes-plus-unresolved-domain-validation')
  assert.equal(provider.extractionStrategy, 'verified-parked-first-party-routes+verified-godaddy-lander-redirects+verified-unresolved-first-party-domains-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'wttinternational.com')
  assert.match(provider.modulePath, /wttinternationalprivatelimited[\\/]script\.js$/i)
})

test('WTT International Private Limited matches company coverage and builds through the provider catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'WTT International Private Limited,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['WTT International Private Limited', 'wttinternationalprivatelimited', 'WTT International Private Limited']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'wttinternationalprivatelimited')

  assert.ok(scraper, 'Expected buildScrapers() to return the WTT International Private Limited scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'wttinternationalprivatelimited')
  assert.equal(scraper.provider.companyName, 'WTT International Private Limited')
  assert.match(scraper.dryRunFile, /wttinternationalprivatelimited[\\/]jobs\.json$/i)
})
