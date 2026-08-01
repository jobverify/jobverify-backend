import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Finzly as a Workable markdown-feed script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'finzly')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'workable')
  assert.equal(provider.companyName, 'Finzly')
  assert.equal(provider.companyCareerPage, 'https://apply.workable.com/finzly/')
  assert.equal(provider.companyDomain, 'apply.workable.com')
  assert.match(provider.modulePath, /finzly[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Finzly scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'finzly')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'finzly')
  assert.equal(scraper.provider.atsPlatform, 'workable')
  assert.match(scraper.dryRunFile, /finzly[\\/]jobs\.json$/)
})
