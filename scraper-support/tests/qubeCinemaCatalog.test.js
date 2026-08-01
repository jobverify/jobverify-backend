import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Qube Cinema as an official careers handoff ApplyToJob scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'qubecinema')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-careers-page-plus-applytojob-board')
  assert.equal(provider.companyCareerPage, 'https://www.qubecinema.com/careers')
  assert.equal(provider.companyDomain, 'qubecinema.com')
  assert.match(provider.modulePath, /qubecinema[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Qube Cinema scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const scraper = scrapers.find((item) => item.name === 'qubecinema')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'qubecinema')
  assert.match(scraper.dryRunFile, /qubecinema[\\/]jobs\.json$/i)
})
