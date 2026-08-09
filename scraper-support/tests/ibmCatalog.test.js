import assert from 'node:assert/strict'
import test from 'node:test'

import { getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes IBM on the official public careers search', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'ibm')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.match(provider.companyCareerPage, /ibm\.com\/careers/i)
  assert.equal(provider.companyDomain, 'ibm.com')
  assert.match(provider.modulePath, /ibm[\\/]script\.js$/i)
})
