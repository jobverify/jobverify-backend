import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'
import INSUREMILE_CATALOG, { VERIFIED_SURFACE_SUMMARY } from './catalog.js'

test('InsureMile catalog metadata captures the current first-party zero-jobs page without aliases', () => {
  assert.equal(INSUREMILE_CATALOG.source, 'insuremile')
  assert.equal(INSUREMILE_CATALOG.companyName, 'InsureMile')
  assert.equal(INSUREMILE_CATALOG.adapter, 'script')
  assert.equal(INSUREMILE_CATALOG.companyCareerPage, 'https://insuremile.in/careers')
  assert.equal(INSUREMILE_CATALOG.atsPlatform, 'official-company-site-no-public-jobs')
  assert.equal(INSUREMILE_CATALOG.countryFilter, 'India')
  assert.equal(INSUREMILE_CATALOG.paginationStrategy, 'single-first-party-careers-page-verification')
  assert.equal(
    INSUREMILE_CATALOG.extractionStrategy,
    'verified-first-party-careers-page-no-open-roles-return-empty',
  )
  assert.equal(INSUREMILE_CATALOG.parser, 'custom-script')
  assert.equal(INSUREMILE_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INSUREMILE_CATALOG.companyDomain, 'insuremile.in')
  assert.equal(INSUREMILE_CATALOG.verifiedOn, '2026-09-03')
  assert.equal(INSUREMILE_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /don't have active job listings right now/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /careers@insuremile\.in/i)
  assert.match(INSUREMILE_CATALOG.modulePath, /insuremile[\\/]script\.js$/i)
})

test('InsureMile exact-name coverage resolves directly from local catalog metadata with no alias requirement', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'InsureMile,\n',
    catalog: [INSUREMILE_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['InsureMile', 'insuremile', 'InsureMile']],
  )
})

test('getScraperCatalog includes InsureMile as a verified first-party zero-jobs provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'insuremile')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'InsureMile')
  assert.equal(provider.companyCareerPage, 'https://insuremile.in/careers')
  assert.equal(provider.companyDomain, 'insuremile.in')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-jobs')
  assert.match(provider.modulePath, /insuremile[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable InsureMile scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'insuremile')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'insuremile')
  assert.equal(scraper.provider.atsPlatform, 'official-company-site-no-public-jobs')
  assert.match(scraper.dryRunFile, /insuremile[\\/]jobs\.json$/i)
})
