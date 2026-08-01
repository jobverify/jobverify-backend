import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

const SOURCE = 'loyalwingmantechnologies'
const COMPANY = 'Loyal Wingman Technologies'

test('Loyal Wingman Technologies is registered as a verified placeholder-site sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Loyal Wingman Technologies provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, 'https://loyalwingman.ai/')
  assert.deepEqual(provider.alternateCareerPages, [
    'https://www.loyalwingman.ai/',
    'https://loyalwingman.ai/robots.txt',
    'https://loyalwingman.ai/careers',
    'https://loyalwingman.ai/jobs',
    'https://loyalwingman.ai/join-us',
    'https://loyalwingman.ai/openings',
    'https://loyalwingman.ai/current-openings',
  ])
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-www-homepage-plus-robots-and-common-careers-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-placeholder-homepage+verified-placeholder-www-homepage+verified-private-robots-surface+verified-placeholder-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'loyalwingman.ai')
  assert.match(provider.modulePath, /loyalwingmantechnologies[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Loyal Wingman Technologies resolves directly from provider metadata and remains runnable in the scraper catalog', () => {
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

  assert.ok(scraper, 'Expected buildScrapers() to return the Loyal Wingman Technologies scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, 'https://loyalwingman.ai/')
  assert.match(scraper.dryRunFile, /loyalwingmantechnologies[\\/]jobs\.json$/i)
})
