import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Rappit is registered as a verified first-party empty-vacancies sentinel with Vanenburg legacy alias coverage', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'rappit')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Rappit')
  assert.equal(provider.companyCareerPage, 'https://rappit.io/vacancies/')
  assert.equal(provider.atsPlatform, 'official-company-careers-empty-board')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'homepage-plus-about-careers-and-vacancies-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-rebrand-about-page+verified-careers-page+verified-empty-vacancies-page',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'rappit.io')
  assert.match(provider.modulePath, /rappit[\\/]script\.js$/i)
  assert.equal(companyAliases.Vanenburg, 'rappit')
})

test('Vanenburg resolves through alias coverage to the Rappit provider and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Vanenburg,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Vanenburg', 'rappit', 'Rappit']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'rappit')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'rappit')
  assert.equal(scraper.provider.companyCareerPage, 'https://rappit.io/vacancies/')
  assert.match(scraper.dryRunFile, /rappit[\\/]jobs\.json$/i)
})
