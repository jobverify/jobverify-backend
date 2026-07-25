import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../magnitglobal/script.js')

test('Magnit Global local catalog captures the verified first-party Dayforce handoff', async () => {
  const { MAGNIT_GLOBAL_CATALOG, default: defaultCatalog } = await import('../magnitglobal/catalog.js')
  const provider = hydrateProviderCatalogEntry(MAGNIT_GLOBAL_CATALOG)

  assert.equal(defaultCatalog, MAGNIT_GLOBAL_CATALOG)
  assert.equal(provider.source, 'magnitglobal')
  assert.equal(provider.companyName, 'Magnit Global')
  assert.equal(provider.companyCareerPage, 'https://magnitglobal.com/us/en/company/careers.html')
  assert.equal(provider.dayforceBaseUrl, 'https://jobs.dayforcehcm.com/en-US/prounlimited/CANDIDATEPORTAL')
  assert.equal(provider.atsPlatform, 'dayforce')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-careers-handoff-plus-dayforce-jobposting-search',
  )
  assert.equal(provider.modulePath, modulePath)
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Analyst, Accounts Payable/i)
})
