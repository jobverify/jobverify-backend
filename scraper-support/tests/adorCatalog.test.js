import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes ADOR as a public careers-page scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'ador')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site')
  assert.equal(provider.companyCareerPage, 'https://adorwelding.com/careers/')
  assert.equal(provider.companyDomain, 'adorwelding.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /ador[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable ADOR scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'ador')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.parser, 'custom-script')
  assert.equal(provider.provider.companyCareerPage, 'https://adorwelding.com/careers/')
})
