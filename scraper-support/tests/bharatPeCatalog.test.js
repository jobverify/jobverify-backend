import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes BharatPe as a verified no-public-jobs first-party source', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bharatpe')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.companyName, 'BharatPe')
  assert.equal(provider.companyCareerPage, 'https://bharatpe.com/career')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-common-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage-plus-missing-first-party-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'bharatpe.com')
  assert.match(provider.modulePath, /bharatpe[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve BharatPe to bharatpe', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bharatpe')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'bharatpe')
  assert.match(scraper.dryRunFile, /bharatpe[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'BharatPe,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.source ?? null]),
    [['BharatPe', 'bharatpe', 'bharatpe']],
  )
})
