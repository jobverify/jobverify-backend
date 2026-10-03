import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Walkaroo is registered as a verified public Zappyhire API provider without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'walkaroo')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Walkaroo')
  assert.equal(provider.companyCareerPage, 'https://recruitcareers.zappyhire.com/en/walkaroo')
  assert.equal(provider.atsPlatform, 'zappyhire')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-public-api-page-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-handoff+published-client-api+verified-tenant+jobs-search+job-details',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'walkaroo.in')
  assert.match(provider.modulePath, /walkaroo[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Walkaroo'), false)
})

test('Walkaroo resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Walkaroo,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Walkaroo', 'walkaroo', 'Walkaroo']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'walkaroo')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'walkaroo')
  assert.equal(scraper.provider.companyCareerPage, 'https://recruitcareers.zappyhire.com/en/walkaroo')
  assert.match(scraper.dryRunFile, /walkaroo[\\/]jobs\.json$/i)
})
