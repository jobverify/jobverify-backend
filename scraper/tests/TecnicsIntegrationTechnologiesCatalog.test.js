import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../tecnicsintegrationtechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../tecnicsintegrationtechnologies/catalog.js')
  } catch {
    assert.fail('Expected Tecnics Integration Technologies catalog module at ../tecnicsintegrationtechnologies/catalog.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Tecnics Integration Technologies local catalog captures the verified APAC careers listings', async () => {
  const { TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = buildCatalogReadyProvider(TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'tecnicsintegrationtechnologies')
  assert.equal(provider.companyName, 'Tecnics Integration Technologies')
  assert.equal(provider.officialBrandName, 'Tecnics')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://tecnics.com/')
  assert.equal(provider.companyCareerPage, 'https://tecnics.com/careers/')
  assert.equal(provider.applyUrl, 'mailto:careers@tecnics.com')
  assert.equal(provider.atsPlatform, 'official-first-party-apac-role-sections')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page')
  assert.equal(provider.extractionStrategy, 'tabbed-role-sections')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'tecnics.com')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Sr\. SAP ABAP Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior DevOps Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /careers@tecnics\.com/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /tecnicsintegrationtechnologies[\\/]jobs\.json$/i)
})

test('Tecnics Integration Technologies exact backlog row resolves from the local provider contract', async () => {
  const { TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Tecnics Integration Technologies\n',
    catalog: [buildCatalogReadyProvider(TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Tecnics Integration Technologies', 'tecnicsintegrationtechnologies', 'Tecnics Integration Technologies']],
  )
})
