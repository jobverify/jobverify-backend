import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Campalin is registered as a verified first-party placeholder sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'campalin')

  assert.ok(provider, 'Expected Campalin provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Campalin')
  assert.equal(provider.companyCareerPage, 'https://campalin.in/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-sitemaps-plus-common-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-placeholder-homepage+verified-sitemaps-without-careers+verified-common-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'campalin.in')
  assert.match(provider.modulePath, /campalin[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Campalin'), false)
})

test('Campalin matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Campalin,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Campalin', 'campalin', 'Campalin']],
  )
})

test('Campalin is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'campalin')

  assert.ok(scraper, 'Expected buildScrapers() to return the Campalin scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'campalin')
  assert.equal(scraper.provider.companyCareerPage, 'https://campalin.in/')
  assert.match(scraper.dryRunFile, /campalin[\\/]jobs\.json$/i)
})
