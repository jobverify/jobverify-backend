import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Mobitech Wireless is registered as a verified first-party careers scraper with the needed CSV alias', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mobitechwireless')

  assert.ok(provider, 'Expected Mobitech Wireless Solution Private Limited provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Mobitech Wireless Solution Private Limited')
  assert.equal(provider.companyCareerPage, 'https://careers.mobitechwireless.in/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-careers-page+inline-job-listings+apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'mobitechwireless.in')
  assert.match(provider.modulePath, /mobitechwireless[\\/]script\.js$/i)
  assert.equal(companyAliases['Mobitech Wireless'], 'mobitechwireless')
})

test('Mobitech Wireless matches coverage through the CSV alias and is runnable', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Mobitech Wireless,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Mobitech Wireless', 'mobitechwireless', 'Mobitech Wireless Solution Private Limited']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'mobitechwireless')

  assert.ok(scraper, 'Expected buildScrapers() to return the Mobitech Wireless Solution Private Limited scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'mobitechwireless')
  assert.equal(scraper.provider.companyCareerPage, 'https://careers.mobitechwireless.in/')
  assert.match(scraper.dryRunFile, /mobitechwireless[\\/]jobs\.json$/i)
})
