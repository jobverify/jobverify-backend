import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('registers Da Vinci Trading against its official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'davincitrading')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Da Vinci Trading')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://davincitrading.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyDomain, 'davincitrading.com')
  assert.equal(companyAliases['Da Vinci Trading'], 'davincitrading')
})

test('buildScrapers exposes a runnable Da Vinci Trading scraper', () => {
  const scraper = buildScrapers().find((item) => item.name === 'davincitrading')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /davincitrading[\\/]jobs\.json$/i)
})
