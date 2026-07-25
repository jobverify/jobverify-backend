import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'sahajanandtechnologiesprivatelimitedstpl'
const COMPANY = 'Sahajanand Laser Technology Ltd. (SLTL Group)'
const COVERAGE_COMPANY = 'Sahajanand Technologies Private Limited (STPL)'
const CAREERS_URL = 'https://www.sltl.com/current-openings/'

test('Sahajanand Laser Technology Ltd. (SLTL Group) is registered with alias coverage for the STPL company row', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-official-current-openings-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'official-current-openings-page+detail-pages+shared-first-party-apply-anchor',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'sltl.com')
  assert.match(provider.modulePath, /sahajanandtechnologiesprivatelimitedstpl[\\/]script\.js$/i)
  assert.equal(companyAliases[COVERAGE_COMPANY], SOURCE)
})

test('Sahajanand Technologies Private Limited (STPL) resolves through alias coverage and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${COVERAGE_COMPANY}\n`,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[COVERAGE_COMPANY, SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, CAREERS_URL)
  assert.match(scraper.dryRunFile, /sahajanandtechnologiesprivatelimitedstpl[\\/]jobs\.json$/i)
})
