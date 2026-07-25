import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Xylem on the official careers page backed by Workday', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'xylem')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'Xylem')
  assert.equal(provider.companyCareerPage, 'https://www.xylem.com/en-us/careers/')
  assert.equal(provider.companyDomain, 'xylem.com')
  assert.equal(provider.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.match(provider.baseUrl, /xylem\.wd5\.myworkdayjobs\.com\/xylem-careers/i)
})

test('buildScrapers exposes a runnable Xylem Workday scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'xylem')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /myworkday[\\/]xylem[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'xylem')
  assert.equal(scraper.provider.atsPlatform, 'workday')
})
