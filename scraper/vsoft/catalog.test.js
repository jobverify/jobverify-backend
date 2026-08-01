import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

const SOURCE = 'vsoft'
const COMPANY = 'VSoft'
const CAREERS_URL = 'https://www.vsoftconsulting.com/careers/'

test('VSoft is registered as a verified Bullhorn-backed careers scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected VSoft provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.equal(provider.atsPlatform, 'bullhorn-oscp')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-careers-page-plus-wordpress-page-api-plus-bullhorn-search-api')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-wordpress-page-api+verified-bullhorn-portal-handoff+india-job-search-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'vsoftconsulting.com')
  assert.match(provider.modulePath, /vsoft[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('VSoft resolves from provider metadata and remains runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'VSoft,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['VSoft', SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the VSoft scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, CAREERS_URL)
  assert.match(scraper.dryRunFile, /vsoft[\\/]jobs\.json$/i)
})
