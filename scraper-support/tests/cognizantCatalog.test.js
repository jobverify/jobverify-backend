import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Cognizant India custom script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const cognizant = catalog.find((provider) => provider.source === 'cognizant')

  assert.ok(cognizant)
  assert.equal(cognizant.adapter, 'script')
  assert.equal(cognizant.atsPlatform, 'official-company-careers')
  assert.match(cognizant.companyCareerPage, /careers\.cognizant\.com\/india-en\/jobs/i)
  assert.equal(cognizant.companyDomain, 'careers.cognizant.com')
})

test('buildScrapers exposes a runnable Cognizant scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const cognizant = scrapers.find((scraper) => scraper.name === 'cognizant')

  assert.ok(cognizant)
  assert.equal(typeof cognizant.run, 'function')
  assert.match(cognizant.dryRunFile, /cognizant[\\/]jobs\.json$/)
  assert.equal(cognizant.provider.source, 'cognizant')
  assert.equal(cognizant.provider.atsPlatform, 'official-company-careers')
})
