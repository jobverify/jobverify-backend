import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Home First Finance Company (HFFC) as an official first-party script provider with verified metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'homefirstfinancecompanyhffc')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Home First Finance Company (HFFC)')
  assert.equal(provider.companyCareerPage, 'https://homefirstindia.com/careers/job-listing')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyDomain, 'homefirstindia.com')
  assert.match(provider.modulePath, /homefirstfinancecompanyhffc[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Home First Finance Company (HFFC) scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'homefirstfinancecompanyhffc')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'homefirstfinancecompanyhffc')
  assert.equal(scraper.provider.parser, 'custom-script')
  assert.match(scraper.dryRunFile, /homefirstfinancecompanyhffc[\\/]jobs\.json$/i)
})
