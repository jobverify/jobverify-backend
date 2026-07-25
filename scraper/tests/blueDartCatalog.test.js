import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Blue Dart as an official careers handoff to a Phenom board', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bluedart')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Blue Dart')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'phenom')
  assert.equal(provider.companyCareerPage, 'https://www.bluedart.com/careers')
  assert.equal(provider.companyDomain, 'bluedart.com')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-careers-page-plus-phenom-handoff')
  assert.equal(provider.extractionStrategy, 'official-careers-page+phenom-search+detail-pages')
  assert.match(provider.modulePath, /bluedart[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Blue Dart without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bluedart')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /bluedart[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'bluedart')

  const report = generateCompanyCoverageReport({
    csvText: 'Blue Dart,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
