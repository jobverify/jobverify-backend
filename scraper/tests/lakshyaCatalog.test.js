import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('Lakshya is registered as a direct first-party careers scraper without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lakshya')

  assert.ok(provider, 'Expected Lakshya provider to be registered in customProviders.json')
  assert.equal(provider.companyName, 'Lakshya')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://lakshyadigital.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-careers-page+inline-job-listings+workable-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lakshyadigital.com')
  assert.match(provider.modulePath, /lakshya[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Lakshya'), false)
})

test('Lakshya matches backlog coverage directly from provider metadata and is runnable', () => {
  const report = generateCompanyCoverageReport({
    csvText: '"Lakshya"\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lakshya', 'lakshya', 'Lakshya']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'lakshya')

  assert.ok(scraper, 'Expected buildScrapers() to return the Lakshya scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lakshya')
  assert.equal(scraper.provider.companyCareerPage, 'https://lakshyadigital.com/careers/')
  assert.match(scraper.dryRunFile, /lakshya[\\/]jobs\.json$/i)
})
