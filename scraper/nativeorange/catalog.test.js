import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Native orange is registered as a verified first-party about-to-contact sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'nativeorange')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Native orange')
  assert.equal(provider.companyCareerPage, 'https://nativeorange.ai/about/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-about-careers-and-contact-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-about-careers-contact-handoff+verified-contact-page-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'nativeorange.ai')
  assert.match(provider.modulePath, /nativeorange[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Native orange'), false)
})

test('Native orange resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Native orange\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Native orange', 'nativeorange', 'Native orange']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'nativeorange')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'nativeorange')
  assert.equal(scraper.provider.companyCareerPage, 'https://nativeorange.ai/about/')
  assert.match(scraper.dryRunFile, /nativeorange[\\/]jobs\.json$/i)
})
