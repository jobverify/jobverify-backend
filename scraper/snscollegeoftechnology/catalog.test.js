import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'snscollegeoftechnology'
const COMPANY = 'SNS College of Technology'
const HOMEPAGE_URL = 'https://snsct.org/'

test('SNS College of Technology is registered as a verified first-party no-public-careers sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected SNS College of Technology provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, HOMEPAGE_URL)
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-robots-sitemap-and-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-career-contact+verified-robots-sitemap+verified-no-public-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'snsct.org')
  assert.match(provider.modulePath, /snscollegeoftechnology[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('SNS College of Technology matches company coverage directly from provider metadata and stays runnable through buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'SNS College of Technology,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[COMPANY, SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the SNS College of Technology scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, HOMEPAGE_URL)
  assert.match(scraper.dryRunFile, /snscollegeoftechnology[\\/]jobs\.json$/i)
})
