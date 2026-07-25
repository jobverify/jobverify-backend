import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Workhall is registered as an official-site empty-sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'workhall')

  assert.ok(provider, 'Expected Workhall provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Workhall Pvt Ltd')
  assert.equal(provider.companyCareerPage, 'https://workhall.co/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-common-careers-route-validation')
  assert.equal(provider.extractionStrategy, 'verified-official-homepage-plus-missing-public-jobs-surface-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'workhall.co')
  assert.match(provider.modulePath, /workhall[\\/]script\.js$/i)
})

test('Workhall resolves through company coverage and remains runnable in the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Workhall Pvt Ltd,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Workhall Pvt Ltd', 'workhall', 'Workhall Pvt Ltd']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'workhall')

  assert.ok(scraper, 'Expected buildScrapers() to return the Workhall scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'workhall')
  assert.equal(scraper.provider.companyName, 'Workhall Pvt Ltd')
  assert.match(scraper.dryRunFile, /workhall[\\/]jobs\.json$/i)
})
