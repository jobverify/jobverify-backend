import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes SuperAGI as an official-site zero-job scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'superagi')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site')
  assert.equal(provider.companyName, 'SuperAGI')
  assert.equal(provider.companyCareerPage, 'https://web.superagi.com/')
  assert.equal(provider.companyDomain, 'web.superagi.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /superagi[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable SuperAGI scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'superagi')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'superagi')
  assert.equal(scraper.provider.companyName, 'SuperAGI')
  assert.match(scraper.dryRunFile, /superagi[\\/]jobs\.json$/i)
})
