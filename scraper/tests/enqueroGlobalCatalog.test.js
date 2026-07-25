import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { getScraperCatalog } from '../providers/index.js'

test('Genpact remains the canonical provider for the Enquero Global lane', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'genpact')

  assert.ok(provider, 'Expected the existing Genpact provider to remain available')
  assert.equal(provider.companyCareerPage, 'https://www.genpact.com/careers')
  assert.equal(provider.companyDomain, 'genpact.com')
  assert.equal(companyAliases['Enquero Global'], 'genpact')
})
