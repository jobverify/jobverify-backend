import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes GlobalLogic as an official careers listings scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'globallogic')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.globallogic.com/careers/')
  assert.equal(provider.companyDomain, 'globallogic.com')
  assert.match(provider.modulePath, /globallogic[\\/]script\.js$/i)
  assert.equal(companyAliases['Global Logic'], 'globallogic')
})

test('buildScrapers exposes a runnable GlobalLogic scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'globallogic')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.atsPlatform, 'official-company-careers')
  assert.match(provider.dryRunFile, /globallogic[\\/]jobs\.json$/)
})
