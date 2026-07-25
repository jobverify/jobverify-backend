import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../anrsoftwareprivatelimited/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../anrsoftwareprivatelimited/catalog.js')
  } catch {
    assert.fail('Expected ANR Software Private Limited catalog module at ../anrsoftwareprivatelimited/catalog.js')
  }
}

const buildProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('ANR Software Private Limited local catalog captures the fail-closed contradictory careers-page contract', async () => {
  const { ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = buildProvider(ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG)

  assert.equal(defaultCatalog, ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG)
  assert.equal(provider.source, 'anrsoftwareprivatelimited')
  assert.equal(provider.companyName, 'ANR Software Private Limited')
  assert.equal(provider.officialBrandName, 'ANR Software Pvt. Ltd.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.anrsoftware.com/')
  assert.equal(provider.companyCareerPage, 'https://www.anrsoftware.com/career/')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-contradictory-no-vacancy-markers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'fail-closed-sentinel')
  assert.equal(provider.extractionStrategy, 'verified-careers-page+contradictory-openings-and-no-vacancy-markers-return-empty')
  assert.equal(provider.companyDomain, 'anrsoftware.com')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
})

test('ANR Software Private Limited exact backlog row resolves from the local provider contract', async () => {
  const { ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'ANR Software Private Limited\n',
    catalog: [buildProvider(ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
