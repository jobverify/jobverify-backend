import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

test('getScraperCatalog includes Hawkins Cookers Ltd as a first-party official jobs scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'hawkinscookersltd')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Hawkins Cookers Ltd')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.hawkinscookers.com/Job_Openings_R.aspx')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-aspnet-jobs-page')
  assert.equal(provider.extractionStrategy, 'official-aspnet-jobs-page+server-button-listings+inline-details')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'hawkinscookers.com')
  assert.match(provider.modulePath, /hawkinscookersltd[\\/]script\.js$/i)
})

test('Hawkins Cookers Ltd coverage resolves the company CSV row without requiring a new alias', () => {
  const scraper = buildScrapers().find((item) => item.name === 'hawkinscookersltd')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /hawkinscookersltd[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'hawkinscookersltd')

  const report = generateCompanyCoverageReport({
    csvText: 'Hawkins Cookers Ltd,',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Hawkins Cookers Ltd', 'hawkinscookersltd', 'Hawkins Cookers Ltd']],
  )
})
