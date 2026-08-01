import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('LG Soft India is registered as a verified first-party Darwinbox-backed scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lgsoftindia')

  assert.ok(provider, 'Expected LG Soft India provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'LG Soft India')
  assert.equal(provider.companyCareerPage, 'https://lgsihrms.darwinbox.in/ms/candidatev2/a6914476a29263/careers/home')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'official-homepage-careers-handoff+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lgsoftindia.com')
  assert.match(provider.modulePath, /lgsoftindia[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'LG Soft India'), false)
})

test('LG Soft India is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'lgsoftindia')

  assert.ok(scraper, 'Expected buildScrapers() to return the LG Soft India scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lgsoftindia')
  assert.equal(
    scraper.provider.companyCareerPage,
    'https://lgsihrms.darwinbox.in/ms/candidatev2/a6914476a29263/careers/home',
  )
  assert.match(scraper.dryRunFile, /lgsoftindia[\\/]jobs\.json$/i)
})

