import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Kumaraguru College of Technology is registered as a verified first-party careers scraper with the Coimbatore alias', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'kumaragurucollegeoftechnology')

  assert.ok(
    provider,
    'Expected Kumaraguru College of Technology provider to be registered in customProviders.json',
  )
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Kumaraguru College of Technology')
  assert.equal(provider.companyCareerPage, 'https://careers.kct.ac.in/current_openings.html')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'homepage-plus-careers-landing-plus-current-openings-plus-detail-pages',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-careers-landing+verified-current-openings+faculty-disciplines+institutional-roles+fellowship-pages',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'kct.ac.in')
  assert.match(provider.modulePath, /kumaragurucollegeoftechnology[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Kumaraguru College of Technology'), false)
  assert.equal(
    companyAliases['Kumaraguru College of Technology, Coimbatore'],
    'kumaragurucollegeoftechnology',
  )
})

test('The Kumaraguru cluster resolves the KCT rows and the Institutions row to the expected canonical scrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: [
      'Kumaraguru College of Technology,',
      '"Kumaraguru College of Technology, Coimbatore",',
      'Kumaraguru Institutions,',
      '',
    ].join('\n'),
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 3)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      [
        'Kumaraguru College of Technology',
        'kumaragurucollegeoftechnology',
        'Kumaraguru College of Technology',
      ],
      [
        'Kumaraguru College of Technology, Coimbatore',
        'kumaragurucollegeoftechnology',
        'Kumaraguru College of Technology',
      ],
      [
        'Kumaraguru Institutions',
        'kumaraguruinstitutions',
        'Kumaraguru Institutions',
      ],
    ],
  )
})

test('Kumaraguru College of Technology is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'kumaragurucollegeoftechnology')

  assert.ok(
    scraper,
    'Expected buildScrapers() to return the Kumaraguru College of Technology scraper',
  )
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'kumaragurucollegeoftechnology')
  assert.equal(scraper.provider.companyCareerPage, 'https://careers.kct.ac.in/current_openings.html')
  assert.match(scraper.dryRunFile, /kumaragurucollegeoftechnology[\\/]jobs\.json$/i)
})
