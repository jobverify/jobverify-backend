import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Lake Chemicals is registered as a verified first-party scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lakechemicalspvtltd')

  assert.ok(provider, 'Expected Lake Chemicals provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Lake Chemicals Pvt. Ltd')
  assert.equal(provider.companyCareerPage, 'https://lakechemicals.com/job-search')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-homepage-plus-first-party-job-search-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-job-search-page+inline-public-role-cards+shared-resume-upload-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lakechemicals.com')
  assert.match(provider.modulePath, /lakechemicalspvtltd[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Lake Chemicals Pvt. Ltd'), false)
})

test('Lake Chemicals matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Lake Chemicals Pvt. Ltd,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lake Chemicals Pvt. Ltd', 'lakechemicalspvtltd', 'Lake Chemicals Pvt. Ltd']],
  )
})

test('Lake Chemicals is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'lakechemicalspvtltd')

  assert.ok(scraper, 'Expected buildScrapers() to return the Lake Chemicals scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lakechemicalspvtltd')
  assert.equal(scraper.provider.companyCareerPage, 'https://lakechemicals.com/job-search')
  assert.match(scraper.dryRunFile, /lakechemicalspvtltd[\\/]jobs\.json$/i)
})
