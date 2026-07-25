import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'sipaltechnologiesindiaprivatelimited'
const COMPANY = 'SIPAL Technologies India Private Limited'

test('SIPAL Technologies India Private Limited is registered as an official-site no-public-jobs sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected SIPAL Technologies India Private Limited provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, 'https://sipal.it/')
  assert.deepEqual(provider.alternateCareerPages, [
    'https://sipal.it/sipal-india-en/',
    'https://sipal.it/sipal-india/',
    'https://sipal.it/careers/',
    'https://sipal.it/jobs/',
    'https://sipal.it/lavora-con-noi/',
    'https://sipal.it/en/careers/',
  ])
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-homepage-plus-missing-public-career-routes')
  assert.equal(provider.extractionStrategy, 'verified-sipal-homepage+verified-stale-india-and-career-routes-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'sipal.it')
  assert.match(provider.modulePath, /sipaltechnologiesindiaprivatelimited[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('SIPAL Technologies India Private Limited matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${COMPANY}\n`,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[COMPANY, SOURCE, COMPANY]],
  )
})

test('SIPAL Technologies India Private Limited is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the SIPAL Technologies India Private Limited scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, 'https://sipal.it/')
  assert.match(scraper.dryRunFile, /sipaltechnologiesindiaprivatelimited[\\/]jobs\.json$/i)
})
