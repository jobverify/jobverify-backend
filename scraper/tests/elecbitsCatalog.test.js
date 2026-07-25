import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Elecbits scraper with official metadata', () => {
  const catalog = getScraperCatalog()
  const elecbits = catalog.find((provider) => provider.source === 'elecbits')

  assert.ok(elecbits)
  assert.equal(elecbits.adapter, 'script')
  assert.equal(elecbits.atsPlatform, 'official-company-careers')
  assert.match(elecbits.companyCareerPage, /elecbits\.in\/careers/i)
  assert.equal(elecbits.companyDomain, 'elecbits.in')
})

test('buildScrapers exposes a runnable Elecbits scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const elecbits = scrapers.find((scraper) => scraper.name === 'elecbits')

  assert.ok(elecbits)
  assert.equal(typeof elecbits.run, 'function')
  assert.match(elecbits.dryRunFile, /elecbits[\\/]jobs\.json$/)
  assert.equal(elecbits.provider.source, 'elecbits')
  assert.equal(elecbits.provider.atsPlatform, 'official-company-careers')
})
