import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/22ndcenturytechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/22ndcenturytechnologies/catalog.js')
  } catch {
    assert.fail('Expected 22nd Century Technologies catalog module at ../../scraper/22ndcenturytechnologies/catalog.js')
  }
}

test('22nd Century Technologies local catalog captures the verified first-party current openings page', async () => {
  const { TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, '22ndcenturytechnologies')
  assert.equal(provider.companyName, '22nd Century Technologies')
  assert.equal(provider.officialBrandName, '22nd Century Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.tscti.com/career/state_il')
  assert.equal(provider.companyDomain, 'tscti.com')
  assert.equal(provider.atsPlatform, 'official-first-party-job-cards')
  assert.equal(provider.countryFilter, 'United States')
  assert.equal(provider.paginationStrategy, 'single-first-party-contract-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-current-openings-contract-page+region-job-table+first-party-apply-links',
  )
  assert.equal(provider.verifiedOn, '2026-08-01')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, August 1, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Basic Clerical/i)
  assert.match(provider.verifiedSurfaceSummary, /Accounting Assistant/i)
})
