import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Velammal Group of schools is registered as a verified apply-only school careers sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'velammalgroupofschools')

  assert.ok(provider, 'Expected Velammal Group of schools provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Velammal Group of schools')
  assert.equal(provider.companyCareerPage, 'https://velammal.org/career/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-career-page-plus-empty-jobs-page-plus-missing-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-career-application-page+verified-empty-jobs-page+verified-missing-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'velammal.org')
  assert.match(provider.modulePath, /velammalgroupofschools[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Velammal Group of schools'), false)
})

test('Velammal Group of schools resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Velammal Group of schools,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Velammal Group of schools', 'velammalgroupofschools', 'Velammal Group of schools']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'velammalgroupofschools')

  assert.ok(scraper, 'Expected buildScrapers() to return the Velammal Group of schools sentinel scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'velammalgroupofschools')
  assert.equal(scraper.provider.companyCareerPage, 'https://velammal.org/career/')
  assert.match(scraper.dryRunFile, /velammalgroupofschools[\\/]jobs\.json$/i)
})
