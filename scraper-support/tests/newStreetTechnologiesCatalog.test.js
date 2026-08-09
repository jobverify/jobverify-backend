import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('New Street Technologies is registered as a verified first-party zero-job scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'newstreettechnologies')

  assert.ok(provider, 'Expected New Street Technologies provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'New Street Technologies')
  assert.equal(provider.companyCareerPage, 'https://newstreettech.com/contact')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-contact-page-plus-common-public-jobs-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-inline-hiring-cta+verified-contact-page-hiring-email+verified-missing-public-jobs-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'newstreettech.com')
  assert.match(provider.modulePath, /newstreettechnologies[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'New Street Technologies'), false)
})

test('New Street Technologies matches the backlog directly and is runnable through buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'New Street Technologies,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['New Street Technologies', 'newstreettechnologies', 'New Street Technologies']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'newstreettechnologies')

  assert.ok(scraper, 'Expected buildScrapers() to return the New Street Technologies scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'newstreettechnologies')
  assert.equal(scraper.provider.companyCareerPage, 'https://newstreettech.com/contact')
  assert.match(scraper.dryRunFile, /newstreettechnologies[\\/]jobs\.json$/i)
})
