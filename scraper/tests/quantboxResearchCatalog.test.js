import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Quantbox Research is registered against the verified first-party public jobs homepage', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'quantboxresearch')

  assert.ok(provider, 'Expected Quantbox Research provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Quantbox Research')
  assert.equal(provider.companyCareerPage, 'https://www.quantboxresearch.com/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-careers-page')
  assert.equal(provider.extractionStrategy, 'verified-homepage-job-cards')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'quantboxresearch.com')
  assert.match(provider.modulePath, /quantboxresearch[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Quantbox Research'), false)
})

test('Quantbox Research CSV rows match directly from provider metadata without alias indirection', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Quantbox Research,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['Quantbox Research', 'quantboxresearch'],
  ])
})

test('Quantbox Research is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'quantboxresearch')

  assert.ok(scraper, 'Expected buildScrapers() to return the Quantbox Research scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'quantboxresearch')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.quantboxresearch.com/')
  assert.match(scraper.dryRunFile, /quantboxresearch[\\/]jobs\.json$/i)
})
