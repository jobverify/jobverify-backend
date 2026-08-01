import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Marut Air is registered against the verified first-party homepage and career page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'marutair')

  assert.ok(provider, 'Expected Marut Air provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Marut Air')
  assert.equal(provider.companyCareerPage, 'https://marutair.com/career/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-careers-page+application-form+hr-contact+no-public-job-records',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'marutair.com')
  assert.match(provider.modulePath, /marutair[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Marut Air scraper', () => {
  const scraper = buildScrapers().find((item) => item.name === 'marutair')

  assert.ok(scraper, 'Expected buildScrapers() to return the Marut Air scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'marutair')
  assert.equal(scraper.provider.companyCareerPage, 'https://marutair.com/career/')
})
