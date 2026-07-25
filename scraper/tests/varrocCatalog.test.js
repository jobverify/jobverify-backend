import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Varroc on the official careers page with a SenseHQ jobs handoff', () => {
  const catalog = getScraperCatalog()
  const varroc = catalog.find((provider) => provider.source === 'varroc')

  assert.ok(varroc)
  assert.equal(varroc.adapter, 'script')
  assert.equal(varroc.atsPlatform, 'sensehq')
  assert.equal(varroc.companyCareerPage, 'https://www.varroc.com/careers')
  assert.equal(varroc.companyDomain, 'varroc.com')
  assert.match(varroc.modulePath, /varroc[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Varroc scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const varroc = scrapers.find((scraper) => scraper.name === 'varroc')

  assert.ok(varroc)
  assert.equal(typeof varroc.run, 'function')
  assert.match(varroc.dryRunFile, /varroc[\\/]jobs\.json$/)
  assert.equal(varroc.provider.source, 'varroc')
  assert.equal(varroc.provider.atsPlatform, 'sensehq')
})
