import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the CaratLane Darwinbox-backed script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const caratlane = catalog.find((provider) => provider.source === 'caratlane')

  assert.ok(caratlane)
  assert.equal(caratlane.adapter, 'script')
  assert.equal(caratlane.atsPlatform, 'darwinbox')
  assert.match(caratlane.companyCareerPage, /caratlane\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i)
})

test('buildScrapers exposes a runnable CaratLane scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const caratlane = scrapers.find((scraper) => scraper.name === 'caratlane')

  assert.ok(caratlane)
  assert.equal(typeof caratlane.run, 'function')
  assert.match(caratlane.dryRunFile, /caratlane[\\/]jobs\.json$/)
  assert.equal(caratlane.provider.source, 'caratlane')
})
