import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Mindsprint as a Darwinbox-backed script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mindsprint')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyName, 'Mindsprint')
  assert.equal(provider.companyCareerPage, 'https://www.mindsprint.com/join-us')
  assert.equal(provider.companyDomain, 'mindsprint.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /mindsprint[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Mindsprint scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'mindsprint')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.adapter, 'script')
  assert.equal(scraper.provider.atsPlatform, 'darwinbox')
  assert.match(scraper.dryRunFile, /mindsprint[\\/]jobs\.json$/)
})
