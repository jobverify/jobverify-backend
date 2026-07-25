import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const johnsonControlsIndiaModulePath = path.resolve(
  currentDir,
  '../johnsoncontrolsindia/script.js',
)

const loadCatalogModule = async () => {
  try {
    return await import('../johnsoncontrolsindia/catalog.js')
  } catch {
    assert.fail('Expected Johnson Controls India catalog module at ../johnsoncontrolsindia/catalog.js')
  }
}

const loadJohnsonControlsIndiaModule = async () => {
  try {
    return await import('../johnsoncontrolsindia/script.js')
  } catch {
    assert.fail('Expected Johnson Controls India scraper module at ../johnsoncontrolsindia/script.js')
  }
}

test('Johnson Controls India local catalog captures the verified first-party search page and Algolia contract without aliases', async () => {
  const { JOHNSON_CONTROLS_INDIA_CATALOG } = await loadCatalogModule()
  const johnsonControlsIndia = await loadJohnsonControlsIndiaModule()
  const provider = hydrateProviderCatalogEntry(JOHNSON_CONTROLS_INDIA_CATALOG)

  assert.equal(provider.source, 'johnsoncontrolsindia')
  assert.equal(provider.companyName, 'Johnson Controls India')
  assert.equal(provider.officialBrandName, 'Johnson Controls')
  assert.equal(provider.adapter, 'script')
  assert.equal(
    provider.companyCareerPage,
    'https://jobs.johnsoncontrols.com/job-search?production_JCI_jobs%5BrefinementList%5D%5Blocations_list%5D%5B0%5D=India',
  )
  assert.equal(
    provider.algoliaSearchUrl,
    'https://um59dwrpa1-1.algolianet.com/1/indexes/*/queries',
  )
  assert.equal(provider.algoliaApplicationId, 'UM59DWRPA1')
  assert.equal(provider.algoliaApiKey, '33719eb8d9f28725f375583b7e78dbab')
  assert.equal(provider.algoliaIndexName, 'production_JCI_jobs')
  assert.equal(provider.atsPlatform, 'algolia')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'algolia-paged-search')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-job-search-page+algolia-jobs-index+official-detail-pages+india-location-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'johnsoncontrols.com')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /johnsoncontrolsindia[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/jobs\.johnsoncontrols\.com\/job-search/i)
  assert.match(provider.verifiedSurfaceSummary, /UM59DWRPA1/i)
  assert.match(provider.verifiedSurfaceSummary, /production_JCI_jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Technical Lead II/i)
  assert.match(provider.verifiedSurfaceSummary, /HR ServiceNow Developer/i)
  assert.equal(provider.modulePath, johnsonControlsIndiaModulePath)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Johnson Controls India'), false)

  assert.equal(johnsonControlsIndia.PROVIDER_METADATA.source, JOHNSON_CONTROLS_INDIA_CATALOG.source)
  assert.equal(
    johnsonControlsIndia.PROVIDER_METADATA.companyName,
    JOHNSON_CONTROLS_INDIA_CATALOG.companyName,
  )
  assert.equal(
    johnsonControlsIndia.PROVIDER_METADATA.algoliaSearchUrl,
    JOHNSON_CONTROLS_INDIA_CATALOG.algoliaSearchUrl,
  )
})

test('Johnson Controls India backlog row matches directly from the local catalog without alias churn', async () => {
  const { JOHNSON_CONTROLS_INDIA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Johnson Controls India\n',
    catalog: [hydrateProviderCatalogEntry(JOHNSON_CONTROLS_INDIA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Johnson Controls India', 'johnsoncontrolsindia', 'Johnson Controls India']],
  )
})
