import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Astronics is registered against the verified group careers chain for Diagnosys coverage', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'astronics')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Astronics Test Systems')
  assert.equal(provider.companyCareerPage, 'https://www.astronics.com/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-page-plus-embedded-appone-location-index')
  assert.equal(
    provider.extractionStrategy,
    'verified-diagnosys-homepage+verified-astronics-careers-page+verified-jobs-page+embedded-appone-board-without-india-locations-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'astronics.com')
  assert.match(provider.modulePath, /astronics[\\/]script\.js$/i)
  assert.equal(
    companyAliases['Diagnosys Electronics (I) Pvt Ltd (ASTRONICS)'],
    'astronics',
  )
})

test('Astronics covers the Diagnosys CSV row through the alias map', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Diagnosys Electronics (I) Pvt Ltd (ASTRONICS)\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[
      'Diagnosys Electronics (I) Pvt Ltd (ASTRONICS)',
      'astronics',
      'Astronics Test Systems',
    ]],
  )
})

test('Astronics is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'astronics')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'astronics')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.astronics.com/careers')
  assert.match(scraper.dryRunFile, /astronics[\\/]jobs\.json$/i)
})
