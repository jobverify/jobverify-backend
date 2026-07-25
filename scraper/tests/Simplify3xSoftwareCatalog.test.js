import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../simplify3xsoftware/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../simplify3xsoftware/catalog.js')
  } catch {
    assert.fail('Expected Simplify3x Software catalog module at ../simplify3xsoftware/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../simplify3xsoftware/script.js')
  } catch {
    assert.fail('Expected Simplify3x Software scraper module at ../simplify3xsoftware/script.js')
  }
}

test('Simplify3x Software local catalog captures the verified fail-closed first-party marketing surface', async () => {
  const { SIMPLIFY3X_SOFTWARE_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const simplify3x = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(SIMPLIFY3X_SOFTWARE_CATALOG)

  assert.equal(defaultCatalog, SIMPLIFY3X_SOFTWARE_CATALOG)
  assert.equal(provider.source, 'simplify3xsoftware')
  assert.equal(provider.companyName, 'Simplify3x Software')
  assert.equal(provider.officialBrandName, 'Simplify3x')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://simplify3x.com/life.html')
  assert.equal(provider.companyDomain, 'simplify3x.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-life-page-plus-common-route-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-life-page+missing-common-job-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Life at Simplify3x/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Simplify3x Software'), false)

  assert.equal(simplify3x.PROVIDER_METADATA.source, SIMPLIFY3X_SOFTWARE_CATALOG.source)
  assert.equal(simplify3x.PROVIDER_METADATA.companyCareerPage, SIMPLIFY3X_SOFTWARE_CATALOG.companyCareerPage)
})

test('Simplify3x Software exact backlog row resolves from the local provider contract', async () => {
  const { SIMPLIFY3X_SOFTWARE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Simplify3x Software\n',
    catalog: [hydrateProviderCatalogEntry(SIMPLIFY3X_SOFTWARE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Simplify3x Software', 'simplify3xsoftware', 'Simplify3x Software']],
  )
})
