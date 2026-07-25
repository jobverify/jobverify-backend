import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../sulavineyards/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../sulavineyards/catalog.js')
  } catch {
    assert.fail('Expected Sula Vineyards catalog module at ../sulavineyards/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../sulavineyards/script.js')
  } catch {
    assert.fail('Expected Sula Vineyards scraper module at ../sulavineyards/script.js')
  }
}

test('Sula Vineyards local catalog captures the verified first-party careers page and fail-closed HROne handoff state', async () => {
  const { SULA_VINEYARDS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const sula = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SULA_VINEYARDS_CATALOG)

  assert.equal(defaultCatalog, SULA_VINEYARDS_CATALOG)
  assert.equal(provider.source, 'sulavineyards')
  assert.equal(provider.companyName, 'Sula Vineyards')
  assert.equal(provider.officialBrandName, 'Sula Vineyards Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://sulavineyards.com/careers.php')
  assert.equal(provider.officialCareersPageUrl, 'https://sulavineyards.com/careers.php')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://app.hrone.cloud/career-portal?ccid=8Qqxv4vYEt7A1wqC_2B0Fw~~&payload=evgE4Qh6f3p6GKeiD4fJQ0LiQsj1hT4DjXVao0Cuhy3Gev16iZi3l6M7u3e72Dhi&dc=sula',
  )
  assert.equal(provider.companyDomain, 'sulavineyards.com')
  assert.equal(provider.atsPlatform, 'hrone-handoff-unverifiable')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-careers-page-plus-external-hrone-handoff-no-verifiable-public-board',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page+verified-hrone-handoff+fail-closed-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /sulavineyards[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/sulavineyards\.com\/careers\.php/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/app\.hrone\.cloud\/career-portal\?/i)
  assert.match(provider.verifiedSurfaceSummary, /Sula Vineyards Limited/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Sula Vineyards'), false)

  assert.equal(sula.PROVIDER_METADATA.source, SULA_VINEYARDS_CATALOG.source)
  assert.equal(sula.PROVIDER_METADATA.companyName, SULA_VINEYARDS_CATALOG.companyName)
})

test('Sula Vineyards exact backlog row matches directly from the local provider metadata', async () => {
  const { SULA_VINEYARDS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Sula Vineyards\n',
    catalog: [hydrateProviderCatalogEntry(SULA_VINEYARDS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sula Vineyards', 'sulavineyards', 'Sula Vineyards']],
  )
})

test('Sula Vineyards hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SULA_VINEYARDS_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SULA_VINEYARDS_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Sula Vineyards')
  assert.equal(provider.companyCareerPage, 'https://sulavineyards.com/careers.php')
  assert.equal(provider.companyDomain, 'sulavineyards.com')
  assert.equal(provider.atsPlatform, 'hrone-handoff-unverifiable')
  assert.match(provider.modulePath, /sulavineyards[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /sulavineyards[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
