import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes MetConnect Infotech as a first-party jobs API scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'metconnectinfotech')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site-public-jobs-page')
  assert.equal(provider.companyName, 'MetConnect Infotech')
  assert.equal(provider.companyCareerPage, 'https://metconnectinfotech.com/company-career')
  assert.equal(provider.companyDomain, 'metconnectinfotech.com')
  assert.match(provider.modulePath, /metconnectinfotech[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable MetConnect Infotech scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'metconnectinfotech')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'metconnectinfotech')
  assert.equal(scraper.provider.companyName, 'MetConnect Infotech')
  assert.match(scraper.dryRunFile, /metconnectinfotech[\\/]jobs\.json$/i)
})
