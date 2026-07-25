import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes PhysicsWallah as a Darwinbox script provider with the verified public careers handoff', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'physicswallah')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.companyName, 'PhysicsWallah')
  assert.equal(
    provider.companyCareerPage,
    'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/home',
  )
  assert.equal(provider.companyDomain, 'pwhr.darwinbox.in')
  assert.match(provider.modulePath, /physicswallah[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable PhysicsWallah scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'physicswallah')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'physicswallah')
  assert.equal(scraper.provider.atsPlatform, 'darwinbox')
  assert.match(scraper.dryRunFile, /physicswallah[\\/]jobs\.json$/i)
})
