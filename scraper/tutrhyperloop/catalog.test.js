import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'tutrhyperloop'
const COMPANY = 'Tutr Hyperloop'
const CAREERS_URL = 'https://tutrhyperloop.com/'

test('Tutr Hyperloop is registered as a verified parked-domain sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Tutr Hyperloop provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.deepEqual(provider.alternateCareerPages, [
    'https://tutrhyperloop.com/careers',
    'https://tutrhyperloop.com/career',
    'https://tutrhyperloop.com/jobs',
    'https://tutrhyperloop.com/join-us',
  ])
  assert.equal(provider.atsPlatform, 'official-company-site-blocked-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-routes-parked-domain-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-parked-homepage+verified-parked-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'tutrhyperloop.com')
  assert.match(provider.modulePath, /tutrhyperloop[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Tutr Hyperloop matches company coverage directly from provider metadata', () => {
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

test('Tutr Hyperloop is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Tutr Hyperloop scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, CAREERS_URL)
  assert.match(scraper.dryRunFile, /tutrhyperloop[\\/]jobs\.json$/i)
})
