import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../optisolbusinesssolutions/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../optisolbusinesssolutions/catalog.js')
  } catch {
    assert.fail('Expected OptiSol Business Solutions catalog module at ../optisolbusinesssolutions/catalog.js')
  }
}

test('OptiSol Business Solutions local catalog captures the verified first-party jobs archive contract', async () => {
  const { OPTISOL_BUSINESS_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(OPTISOL_BUSINESS_SOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, OPTISOL_BUSINESS_SOLUTIONS_CATALOG)
  assert.equal(provider.source, 'optisolbusinesssolutions')
  assert.equal(provider.companyName, 'OptiSol Business Solutions')
  assert.equal(provider.officialBrandName, 'OptiSol')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.optisolbusiness.com/join-with-us')
  assert.equal(provider.companyCareerPage, 'https://www.optisolbusiness.com/job-type/full-time')
  assert.equal(provider.currentOpeningsUrl, 'https://www.optisolbusiness.com/current-openings')
  assert.equal(provider.companyDomain, 'optisolbusiness.com')
  assert.equal(provider.atsPlatform, 'first-party-wordpress-job-pages')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'wordpress-job-type-archive')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-landing+job-type-archive+same-domain-job-detail-pages',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Solution Architect/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Sales Development Representative/i)
})

test('OptiSol Business Solutions exact backlog row resolves from the local catalog contract', async () => {
  const { OPTISOL_BUSINESS_SOLUTIONS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'OptiSol Business Solutions\n',
    catalog: [hydrateProviderCatalogEntry(OPTISOL_BUSINESS_SOLUTIONS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
