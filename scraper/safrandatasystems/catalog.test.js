import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'safrandatasystems'
const COMPANY = 'Safran Data Systems'
const FILTERED_JOBS_URL = 'https://www.safran-group.com/fr/offres?companies%5B%5D=609-safran-data-systems'

test('Safran Data Systems is registered against the exact first-party filtered jobs surface without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Safran Data Systems provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, FILTERED_JOBS_URL)
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'France')
  assert.equal(provider.paginationStrategy, 'exact-company-filter-query-plus-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-company-page+verified-exact-company-filter+paginated-first-party-job-cards+same-domain-detail-pages+jsonld+first-party-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'safran-group.com')
  assert.match(provider.modulePath, /safrandatasystems[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Safran Data Systems matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${COMPANY},\n`,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[COMPANY, SOURCE, COMPANY]],
  )
})

test('Safran Data Systems is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Safran Data Systems scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, FILTERED_JOBS_URL)
  assert.match(scraper.dryRunFile, /safrandatasystems[\\/]jobs\.json$/i)
})
