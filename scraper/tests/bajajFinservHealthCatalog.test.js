import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Bajaj Finserv Health as a PeopleStrong script provider', () => {
  const catalog = getScraperCatalog()
  const bajaj = catalog.find((provider) => provider.source === 'bajajfinservhealth')

  assert.ok(bajaj)
  assert.equal(bajaj.adapter, 'script')
  assert.equal(bajaj.atsPlatform, 'peoplestrong')
  assert.match(bajaj.companyCareerPage, /bajajfinservhealth\.in\/join-us\/?$/i)
  assert.equal(bajaj.companyDomain, 'bfhlcareers.peoplestrong.com')
  assert.match(bajaj.modulePath, /bajajfinservhealth[\\/]script\.js$/)
})

test('buildScrapers exposes a runnable Bajaj Finserv Health scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const bajaj = scrapers.find((scraper) => scraper.name === 'bajajfinservhealth')

  assert.ok(bajaj)
  assert.equal(typeof bajaj.run, 'function')
  assert.match(bajaj.dryRunFile, /bajajfinservhealth[\\/]jobs\.json$/)
  assert.equal(bajaj.provider.source, 'bajajfinservhealth')
  assert.equal(bajaj.provider.atsPlatform, 'peoplestrong')
})
