import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'lsdevicespltd'
const COMPANY = 'LS Devices (P) Ltd'

test('LS Devices (P) Ltd is registered as a verified expired-domain sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected LS Devices (P) Ltd provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, 'http://lsdevices.com/')
  assert.deepEqual(provider.alternateCareerPages, [
    'http://www.lsdevices.com/',
    'http://lsdevices.com/robots.txt',
    'http://lsdevices.com/career',
    'http://lsdevices.com/careers',
    'http://lsdevices.com/careers/',
    'http://lsdevices.com/jobs',
    'http://lsdevices.com/openings',
    'http://lsdevices.com/current-openings',
  ])
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-www-homepage-plus-robots-and-common-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-expired-wix-homepage+verified-expired-wix-www-homepage+verified-expired-wix-robots-surface+verified-expired-wix-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lsdevices.com')
  assert.match(provider.modulePath, /lsdevicespltd[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('LS Devices (P) Ltd resolves directly from provider metadata and remains runnable in the scraper catalog', () => {
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

  assert.ok(scraper, 'Expected buildScrapers() to return the LS Devices (P) Ltd scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, 'http://lsdevices.com/')
  assert.match(scraper.dryRunFile, /lsdevicespltd[\\/]jobs\.json$/i)
})
