import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const SOURCE = 'pangeatech'
const COMPANY = 'Pangea Tech'
const HOMEPAGE_URL = 'https://pangea.tech/'

test('Pangea Tech is registered as a canonical-host sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Pangea Tech provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, HOMEPAGE_URL)
  assert.deepEqual(provider.alternateCareerPages, [
    'https://www.pangea.tech/',
    'https://pangeatech.com/',
    'https://www.pangeatech.com/',
    'https://pangeatech.in/',
    'https://www.pangeatech.in/',
    'https://pangea-tech.com/',
    'https://pangea-tech.com/careers',
    'https://pangea-tech.com/jobs',
    'https://pangea-tech.com/about-us',
  ])
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'canonical-host-validation-plus-unrelated-live-host-route-check')
  assert.equal(
    provider.extractionStrategy,
    'verified-canonical-host-absence+verified-unrelated-live-host-shell+verified-missing-unrelated-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'pangea.tech')
  assert.match(provider.modulePath, /pangeatech[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Pangea Tech resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${COMPANY},\n`,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[COMPANY, SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Pangea Tech sentinel scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, HOMEPAGE_URL)
  assert.match(scraper.dryRunFile, /pangeatech[\\/]jobs\.json$/i)
})
