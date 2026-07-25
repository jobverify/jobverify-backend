import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('Sutherland Global is registered against its official Shazamme-powered public careers surface', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'sutherlandglobal')

  assert.ok(provider, 'Expected Sutherland Global provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Sutherland Global')
  assert.equal(provider.companyCareerPage, 'https://www.jobs.sutherlandglobal.com/job-results')
  assert.equal(provider.atsPlatform, 'shazamme')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-feed')
  assert.equal(provider.extractionStrategy, 'official-job-results-page-validation+shazamme-public-get-jobs-feed')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'jobs.sutherlandglobal.com')
  assert.match(provider.modulePath, /sutherlandglobal[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'SUTHERLAND GLOBAL'), false)
})

test('SUTHERLAND GLOBAL matches directly from provider metadata without a new alias', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'SUTHERLAND GLOBAL,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['SUTHERLAND GLOBAL', 'sutherlandglobal'],
  ])
})

test('Sutherland Global is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sutherlandglobal')

  assert.ok(scraper, 'Expected buildScrapers() to return the Sutherland Global scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'sutherlandglobal')
  assert.equal(scraper.provider.atsPlatform, 'shazamme')
  assert.match(scraper.dryRunFile, /sutherlandglobal[\\/]jobs\.json$/i)
})
