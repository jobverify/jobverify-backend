import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Verizon on the official careers page backed by Workday', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'verizon')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'Verizon')
  assert.equal(provider.companyCareerPage, 'https://mycareer.verizon.com/jobs/')
  assert.equal(provider.companyDomain, 'mycareer.verizon.com')
  assert.equal(provider.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.match(provider.baseUrl, /verizon\.wd12\.myworkdayjobs\.com\/verizon-careers/i)
})

test('buildScrapers exposes a runnable Verizon Workday scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'verizon')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /myworkday[\\/]verizon[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'verizon')
  assert.equal(scraper.provider.atsPlatform, 'workday')
})
