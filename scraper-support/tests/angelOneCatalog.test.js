import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Angel One as a verified first-party zero-openings careers shell', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'angelone')

  assert.ok(provider, 'Expected Angel One provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Angel One')
  assert.equal(provider.companyCareerPage, 'https://www.angelone.in/careers')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-jobs-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-zero-openings-jobs-shell-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'angelone.in')
  assert.match(provider.modulePath, /angelone[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Angel One to the angelone source', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Angel One,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Angel One', 'angelone', 'Angel One']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'angelone')

  assert.ok(scraper, 'Expected buildScrapers() to return the Angel One scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'angelone')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.angelone.in/careers')
  assert.match(scraper.dryRunFile, /angelone[\\/]jobs\.json$/i)
})
