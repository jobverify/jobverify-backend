import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes StoneX India as an iCIMS script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'stonexindia')

  assert.ok(provider)
  assert.equal(provider.companyName, 'StoneX India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'icims')
  assert.equal(provider.companyCareerPage, 'https://www.stonex.com/en/about/careers/jobs/')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-official-jobs-page')
  assert.equal(provider.extractionStrategy, 'official-html-job-cards+icims-detail-page')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'stonex.com')
  assert.match(provider.modulePath, /stonexindia[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve StoneX India to the stonexindia source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'stonexindia')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /stonexindia[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'stonexindia')

  const report = generateCompanyCoverageReport({
    csvText: 'StoneX India,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['StoneX India', 'stonexindia', 'StoneX India']],
  )
})
