import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Kumaraguru Institutions is registered as a verified first-party careers scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'kumaraguruinstitutions')

  assert.ok(
    provider,
    'Expected Kumaraguru Institutions provider to be registered in customProviders.json',
  )
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Kumaraguru Institutions')
  assert.equal(provider.companyCareerPage, 'https://careers.kumaraguru.edu.in/current_openings.php')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'homepage-plus-careers-landing-plus-current-openings-plus-academic-and-support-pages',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-careers-landing+verified-current-openings+academic-recruitment-categories+support-services-categories',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'kumaraguru.edu.in')
  assert.match(provider.modulePath, /kumaraguruinstitutions[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Kumaraguru Institutions'), false)
})

test('Kumaraguru Institutions matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Kumaraguru Institutions,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Kumaraguru Institutions', 'kumaraguruinstitutions', 'Kumaraguru Institutions']],
  )
})

test('Kumaraguru Institutions is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'kumaraguruinstitutions')

  assert.ok(
    scraper,
    'Expected buildScrapers() to return the Kumaraguru Institutions scraper',
  )
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'kumaraguruinstitutions')
  assert.equal(scraper.provider.companyCareerPage, 'https://careers.kumaraguru.edu.in/current_openings.php')
  assert.match(scraper.dryRunFile, /kumaraguruinstitutions[\\/]jobs\.json$/i)
})
