import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Storeys Real Estate is registered as a verified broken first-party careers sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'storeysrealestate')

  assert.ok(provider, 'Expected Storeys Real Estate provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Storeys Real Estate')
  assert.equal(provider.companyCareerPage, 'https://www.storeys.ae/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'United Arab Emirates')
  assert.equal(provider.paginationStrategy, 'none-static-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-broken-wordpress-json-careers-surface-plus-unavailable-api-no-public-job-list',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'storeys.ae')
  assert.match(provider.verifiedSurfaceSummary, /Wednesday, August 5, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /critical error on this website/i)
  assert.match(provider.verifiedSurfaceSummary, /api\/v1\/careers/i)
  assert.match(provider.modulePath, /storeysrealestate[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Storeys Real Estate'), false)
})

test('Storeys Real Estate resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Storeys Real Estate,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Storeys Real Estate', 'storeysrealestate', 'Storeys Real Estate']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'storeysrealestate')

  assert.ok(scraper, 'Expected buildScrapers() to return the Storeys Real Estate sentinel scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'storeysrealestate')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.storeys.ae/careers')
  assert.match(scraper.dryRunFile, /storeysrealestate[\\/]jobs\.json$/i)
})
