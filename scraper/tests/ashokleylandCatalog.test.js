import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Ashok Leyland Darwinbox-backed script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const ashokLeyland = catalog.find((provider) => provider.source === 'ashokleyland')

  assert.ok(ashokLeyland)
  assert.equal(ashokLeyland.adapter, 'script')
  assert.equal(ashokLeyland.atsPlatform, 'darwinbox')
  assert.match(ashokLeyland.companyCareerPage, /ashokleyland\.com\/in\/careers/i)
})

test('buildScrapers exposes a runnable Ashok Leyland scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const ashokLeyland = scrapers.find((scraper) => scraper.name === 'ashokleyland')

  assert.ok(ashokLeyland)
  assert.equal(typeof ashokLeyland.run, 'function')
  assert.match(ashokLeyland.dryRunFile, /ashokleyland[\\/]jobs\.json$/)
  assert.equal(ashokLeyland.provider.source, 'ashokleyland')
})
