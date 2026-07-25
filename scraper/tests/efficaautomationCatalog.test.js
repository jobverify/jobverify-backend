import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Effica Automation scraper with official metadata', () => {
  const catalog = getScraperCatalog()
  const effica = catalog.find((provider) => provider.source === 'efficaautomation')

  assert.ok(effica)
  assert.equal(effica.adapter, 'script')
  assert.equal(effica.atsPlatform, 'official-company-careers')
  assert.match(effica.companyCareerPage, /effica\.in\/careers\.html/i)
  assert.equal(effica.companyDomain, 'effica.in')
})

test('buildScrapers exposes a runnable Effica Automation scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const effica = scrapers.find((scraper) => scraper.name === 'efficaautomation')

  assert.ok(effica)
  assert.equal(typeof effica.run, 'function')
  assert.match(effica.dryRunFile, /efficaautomation[\\/]jobs\.json$/)
  assert.equal(effica.provider.source, 'efficaautomation')
  assert.equal(effica.provider.atsPlatform, 'official-company-careers')
})
