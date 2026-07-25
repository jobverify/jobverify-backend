import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../aigbusinesssolution/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../aigbusinesssolution/catalog.js')
  } catch {
    assert.fail('Expected AIG Business Solution catalog module at ../aigbusinesssolution/catalog.js')
  }
}

test('AIG Business Solution local catalog captures the verified first-party openings surface', async () => {
  const { AIG_BUSINESS_SOLUTION_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(AIG_BUSINESS_SOLUTION_CATALOG)

  assert.equal(defaultCatalog, AIG_BUSINESS_SOLUTION_CATALOG)
  assert.equal(provider.source, 'aigbusinesssolution')
  assert.equal(provider.companyName, 'AIG Business Solution')
  assert.equal(provider.officialBrandName, 'AIG Healthcare')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://aighealthcare.in/careers')
  assert.equal(provider.companyCareerPage, 'https://aighealthcare.in/openings')
  assert.equal(provider.companyDomain, 'aighealthcare.in')
  assert.equal(provider.atsPlatform, 'first-party-openings-page-with-same-domain-job-assets')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-openings-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-shell+verified-openings-page+same-domain-opening-links',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Join the rightful revolution/i)
  assert.match(provider.verifiedSurfaceSummary, /IKS Health/i)
  assert.match(provider.verifiedSurfaceSummary, /Customer Service Representative/i)
})

test('AIG Business Solution exact backlog row resolves from the local catalog contract', async () => {
  const { AIG_BUSINESS_SOLUTION_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'AIG Business Solution\n',
    catalog: [hydrateProviderCatalogEntry(AIG_BUSINESS_SOLUTION_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AIG Business Solution', 'aigbusinesssolution', 'AIG Business Solution']],
  )
})
