import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../../scraper-support/providers/index.js'

test('getScraperCatalog includes Lionsbot as an official Kula-backed script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lionsbot')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Lionsbot')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'kula')
  assert.equal(provider.companyCareerPage, 'https://www.lionsbot.com/careers/')
  assert.equal(provider.companyDomain, 'lionsbot.com')
  assert.match(provider.modulePath, /lionsbot[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Lionsbot scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'lionsbot')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lionsbot')
  assert.equal(scraper.provider.companyName, 'Lionsbot')
  assert.match(scraper.dryRunFile, /lionsbot[\\/]jobs\.json$/i)
})
