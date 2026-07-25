import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'manhatten'
const COMPANY = 'Manhatten'

test('Manhatten is registered against the verified Manhattan Associates official Workday surface', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Manhatten provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.officialBrandName, 'Manhattan Associates')
  assert.equal(provider.companyCareerPage, 'https://www.manh.com/en-in/about-us/careers')
  assert.deepEqual(provider.alternateCareerPages, [
    'https://manh.wd5.myworkdayjobs.com/en-US/External/jobs',
  ])
  assert.equal(provider.atsPlatform, 'workday-jobs-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-workday-cxs-search-text')
  assert.equal(provider.extractionStrategy, 'verified-manhattan-associates-careers-page+workday-cxs-searchText-india')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'manh.com')
  assert.match(provider.modulePath, /manhatten[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Manhatten resolves directly from provider metadata and remains runnable in the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${COMPANY}\n`,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[COMPANY, SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Manhatten scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, 'https://www.manh.com/en-in/about-us/careers')
  assert.match(scraper.dryRunFile, /manhatten[\\/]jobs\.json$/i)
})
