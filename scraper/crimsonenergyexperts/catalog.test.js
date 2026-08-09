import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

const SOURCE = 'crimsonenergyexperts'
const COMPANY = 'Crimson Energy Experts Pvt Ltd'
const CAREERS_URL = 'https://crimsonenergy.in/careers.html'

test('Crimson Energy Experts is registered against its verified first-party careers page without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Crimson Energy Experts provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-sitemap-plus-first-party-careers-page-plus-missing-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-sitemap+verified-first-party-careers-page+inline-opportunity-cards+google-form-apply-links+verified-missing-jobs-routes',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'crimsonenergy.in')
  assert.match(provider.modulePath, /crimsonenergyexperts[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Crimson Energy Experts matches company coverage directly from provider metadata', () => {
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

test('Crimson Energy Experts is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Crimson Energy Experts scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, CAREERS_URL)
  assert.match(scraper.dryRunFile, /crimsonenergyexperts[\\/]jobs\.json$/i)
})
