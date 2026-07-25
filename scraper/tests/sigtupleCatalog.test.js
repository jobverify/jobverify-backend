import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Sigtuple as a Workable script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'sigtuple')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'workable')
  assert.equal(provider.companyName, 'Sigtuple')
  assert.equal(provider.companyCareerPage, 'https://apply.workable.com/sigtuple/')
  assert.equal(provider.companyDomain, 'apply.workable.com')
  assert.match(provider.modulePath, /sigtuple[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Sigtuple scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sigtuple')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'sigtuple')
  assert.equal(scraper.provider.atsPlatform, 'workable')
  assert.match(scraper.dryRunFile, /sigtuple[\\/]jobs\.json$/i)
})
