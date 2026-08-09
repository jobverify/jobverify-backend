import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Go Digit Darwinbox-backed provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const goDigit = catalog.find((provider) => provider.source === 'godigit')

  assert.ok(goDigit)
  assert.equal(goDigit.companyName, 'Go Digit General Insurance')
  assert.equal(goDigit.adapter, 'script')
  assert.equal(goDigit.atsPlatform, 'darwinbox')
  assert.equal(goDigit.companyCareerPage, 'https://www.godigit.com/careers')
})

test('buildScrapers exposes a runnable Go Digit scraper', () => {
  const goDigit = buildScrapers().find((scraper) => scraper.name === 'godigit')

  assert.ok(goDigit)
  assert.equal(typeof goDigit.run, 'function')
  assert.match(goDigit.dryRunFile, /godigit[\\/]jobs\.json$/)
})
