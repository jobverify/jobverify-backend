import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes the City Union Bank official careers scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'cityunionbank')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.match(provider.companyCareerPage, /cityunionbank\.bank\.in\/careers/i)
  assert.equal(provider.companyDomain, 'cityunionbank.bank.in')
  assert.match(provider.modulePath, /cityunionbank[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable City Union Bank scraper', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cityunionbank')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /cityunionbank[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'cityunionbank')
})
