import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../bentleysystems/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../bentleysystems/catalog.js')
  } catch {
    assert.fail('Expected Bentley Systems catalog module at ../bentleysystems/catalog.js')
  }
}

test('Bentley Systems local catalog captures the verified first-party jobs host without alias churn', async () => {
  const { BENTLEY_SYSTEMS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(BENTLEY_SYSTEMS_CATALOG)

  assert.equal(defaultCatalog, BENTLEY_SYSTEMS_CATALOG)
  assert.equal(provider.source, 'bentleysystems')
  assert.equal(provider.companyName, 'Bentley Systems')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.bentley.com/company/careers/')
  assert.equal(provider.companyDomain, 'bentley.com')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-location-search-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-jobs-host+india-location-search-results+detail-pages',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /bentleysystems[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /jobs\.bentley\.com/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Bentley Systems'), false)
})

test('Bentley Systems backlog row matches directly from the local catalog', async () => {
  const { BENTLEY_SYSTEMS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Bentley Systems\n',
    catalog: [hydrateProviderCatalogEntry(BENTLEY_SYSTEMS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bentley Systems', 'bentleysystems', 'Bentley Systems']],
  )
})

test('Bentley Systems hydrated local catalog stays script-runner compatible', async () => {
  const { BENTLEY_SYSTEMS_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(BENTLEY_SYSTEMS_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(typeof module.run, 'function')
})
