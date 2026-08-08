import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('KGISL is registered as a verified first-party candidate portal scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'kgisl')

  assert.ok(provider, 'Expected KGISL provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'KGISL')
  assert.equal(provider.companyCareerPage, 'https://www.kgisl.com/current-openings/')
  assert.equal(provider.atsPlatform, 'official-first-party-candidate-portal')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'homepage-plus-careers-page-plus-current-openings-page-plus-first-party-candidate-portal-with-wrapper-timeout-fallback',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-careers-page+verified-current-openings-iframe+first-party-inline-job-cards+candidate-portal-fallback-when-kgisl-wrappers-time-out',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'kgisl.com')
  assert.equal(provider.verifiedOn, '2026-08-07')
  assert.equal(provider.verifiedPublicJobCount, 17)
  assert.equal(
    provider.verifiedSampleJobTitle,
    'Senior Cloud Infrastructure & Security Engineer - Solution Architect',
  )
  assert.match(provider.verifiedSampleJobUrl, /careerxai\.kgisl\.com\/resume\/webportal_vacancy_apply_resume/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, August 7, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /17 public inline job cards/i)
  assert.match(provider.verifiedSurfaceSummary, /wrapper pages under https:\/\/www\.kgisl\.com\/ returned upstream 500\/504 errors and timeouts/i)
  assert.match(provider.modulePath, /kgisl[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'KGISL'), false)
})

test('KGISL matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'KGISL,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['KGISL', 'kgisl', 'KGISL']],
  )
})

test('KGISL is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'kgisl')

  assert.ok(scraper, 'Expected buildScrapers() to return the KGISL scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'kgisl')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.kgisl.com/current-openings/')
  assert.match(scraper.dryRunFile, /kgisl[\\/]jobs\.json$/i)
})
