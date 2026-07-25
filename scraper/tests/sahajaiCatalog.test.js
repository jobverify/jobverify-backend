import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Sahaj AI as an official careers script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'sahajai')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Sahaj AI')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://sahaj.ai/careers/')
  assert.equal(provider.companyDomain, 'sahaj.ai')
  assert.match(provider.modulePath, /sahajai[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Sahaj AI scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sahajai')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'sahajai')
  assert.match(scraper.dryRunFile, /sahajai[\\/]jobs\.json$/i)
})
