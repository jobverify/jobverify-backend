import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

const SOURCE = 'sigmacomputing'
const COMPANY = 'Sigma Computing'
const CAREERS_URL = 'https://www.sigmacomputing.com/company/careers'

test('Sigma Computing is registered as a verified first-party careers plus Greenhouse provider without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Sigma Computing provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.equal(provider.atsPlatform, 'greenhouse')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-careers-page-plus-public-greenhouse-board')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+public-greenhouse-jobs-api+india-location-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'sigmacomputing.com')
  assert.match(provider.modulePath, /sigmacomputing[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Sigma Computing resolves directly from provider metadata and remains runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Sigma Computing,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sigma Computing', SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Sigma Computing scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, CAREERS_URL)
  assert.match(scraper.dryRunFile, /sigmacomputing[\\/]jobs\.json$/i)
})
