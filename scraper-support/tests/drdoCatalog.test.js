import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes DRDO with its official vacancies page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'drdo')

  assert.ok(provider)
  assert.equal(provider.companyName, 'DRDO')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-government-careers')
  assert.equal(provider.companyCareerPage, 'https://drdo.gov.in/drdo/en/offerings/vacancies')
  assert.equal(provider.companyDomain, 'drdo.gov.in')
  assert.match(provider.modulePath, /drdo[\\/]script\.js$/i)
})

test('buildScrapers exposes the DRDO scraper through the existing runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'drdo')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.companyName, 'DRDO')
})
