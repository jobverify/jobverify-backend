import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes SolarSquare with the verified public Keka careers metadata and exact alias coverage', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'solarsquare')

  assert.ok(provider)
  assert.equal(provider.companyName, 'SolarSquare')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'keka-public-careers-api')
  assert.equal(provider.companyCareerPage, 'https://www.solarsquare.in/about-us/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-keka-jobs-endpoint')
  assert.equal(provider.extractionStrategy, 'official-company-page+public-keka-careers-api+departments+applyjob')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'solarsquare.in')
  assert.match(provider.modulePath, /solarsquare[\\/]script\.js$/i)
  assert.equal(companyAliases['SolarSquare Energy Pvt. Ltd.'], 'solarsquare')
})

test('buildScrapers and company coverage resolve SolarSquare Energy Pvt. Ltd. to the solarsquare source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'solarsquare')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /solarsquare[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'solarsquare')

  const report = generateCompanyCoverageReport({
    csvText: 'SolarSquare Energy Pvt. Ltd.,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['SolarSquare Energy Pvt. Ltd.', 'solarsquare', 'SolarSquare']],
  )
})
