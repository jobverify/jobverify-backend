import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Orion Innovation as an official API-only careers scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'orioninnovation')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Orion Innovation')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.orioninnovation.com/careers/job/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-official-jobs-page-plus-greenhouse-feed')
  assert.equal(
    provider.extractionStrategy,
    'official-jobs-page-html-cards+greenhouse-public-api-details+india-location-filter',
  )
  assert.equal(provider.companyDomain, 'orioninnovation.com')
  assert.match(provider.modulePath, /orioninnovation[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Orion Innovation without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'orioninnovation')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'orioninnovation')
  assert.match(scraper.dryRunFile, /orioninnovation[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Orion Innovation,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Orion Innovation', 'orioninnovation', 'Orion Innovation']],
  )
})
