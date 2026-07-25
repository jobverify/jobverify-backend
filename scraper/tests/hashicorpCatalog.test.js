import assert from 'node:assert/strict'
import test from 'node:test'

import { getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes HashiCorp on its official careers overview page', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'hashicorp')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.match(provider.companyCareerPage, /hashicorp\.com\/en\/careers/i)
  assert.equal(provider.companyDomain, 'hashicorp.com')
  assert.match(provider.modulePath, /hashicorp[\\/]script\.js$/i)
})
