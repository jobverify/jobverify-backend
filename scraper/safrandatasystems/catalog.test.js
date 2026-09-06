import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

const SOURCE = 'safrandatasystems'
const COMPANY = 'Safran Data Systems'
const SEARCH_URL =
  'https://careers.safran-group.com/offre-de-emploi/liste-toutes-offres.aspx?Keywords=Safran%20Data%20Systems'
const COMPANY_PAGE_URL = 'https://www.safran-group.com/fr/societes/safran-data-systems'
const RSS_URL =
  'https://careers.safran-group.com/handlers/offerRss.ashx?LCID=1036&Keywords=Safran%20Data%20Systems'

test('Safran Data Systems is registered against the verified accessible keyword-search surface without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Safran Data Systems provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, SEARCH_URL)
  assert.equal(provider.officialCompanyPageUrl, COMPANY_PAGE_URL)
  assert.equal(provider.officialJobsRssUrl, RSS_URL)
  assert.equal(provider.atsPlatform, 'official-first-party-keyword-search')
  assert.equal(provider.countryFilter, 'France')
  assert.equal(provider.paginationStrategy, 'accessible-keyword-search-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-keyword-search+detail-pages+exact-company-meta-description',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.safran-group.com')
  assert.equal(provider.verifiedOn, '2026-08-14')
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
  assert.equal(scraper.provider.companyCareerPage, SEARCH_URL)
  assert.match(scraper.dryRunFile, /safrandatasystems[\\/]jobs\.json$/i)
})
