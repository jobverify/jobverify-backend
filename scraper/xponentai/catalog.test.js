import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('xponent.ai is registered as a verified first-party WP Job Openings scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'xponentai')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'xponent.ai')
  assert.equal(provider.companyCareerPage, 'https://xponent.ai/career/')
  assert.equal(provider.atsPlatform, 'wp-job-openings')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-page-plus-first-party-wp-rest-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-page+official-wordpress-job-openings-rest-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'xponent.ai')
  assert.match(provider.modulePath, /xponentai[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'xponent.ai'), false)
})

test('xponent.ai resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'xponent.ai,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['xponent.ai', 'xponentai', 'xponent.ai']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'xponentai')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'xponentai')
  assert.equal(scraper.provider.companyCareerPage, 'https://xponent.ai/career/')
  assert.match(scraper.dryRunFile, /xponentai[\\/]jobs\.json$/i)
})
