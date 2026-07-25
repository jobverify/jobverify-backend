import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Bosch Rexroth scraper with official metadata', () => {
  const catalog = getScraperCatalog()
  const boschRexroth = catalog.find((provider) => provider.source === 'boschrexroth')

  assert.ok(boschRexroth)
  assert.equal(boschRexroth.adapter, 'script')
  assert.equal(boschRexroth.atsPlatform, 'bosch-content-api')
  assert.match(boschRexroth.companyCareerPage, /jobs\.bosch\.com\/en/i)
  assert.equal(boschRexroth.companyDomain, 'jobs.bosch.com')
})

test('buildScrapers exposes a runnable Bosch Rexroth scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const boschRexroth = scrapers.find((scraper) => scraper.name === 'boschrexroth')

  assert.ok(boschRexroth)
  assert.equal(typeof boschRexroth.run, 'function')
  assert.match(boschRexroth.dryRunFile, /boschrexroth[\\/]jobs\.json$/)
  assert.equal(boschRexroth.provider.source, 'boschrexroth')
  assert.equal(boschRexroth.provider.atsPlatform, 'bosch-content-api')
})
