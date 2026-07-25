import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../ruralshores/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../ruralshores/catalog.js')
  } catch {
    assert.fail('Expected RuralShores catalog module at ../ruralshores/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../ruralshores/script.js')
  } catch {
    assert.fail('Expected RuralShores scraper module at ../ruralshores/script.js')
  }
}

test('RuralShores local catalog captures the verified first-party HTML job board', async () => {
  const { RURALSHORES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const ruralShores = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(RURALSHORES_CATALOG)

  assert.equal(defaultCatalog, RURALSHORES_CATALOG)
  assert.equal(provider.source, 'ruralshores')
  assert.equal(provider.companyName, 'RuralShores')
  assert.equal(provider.officialBrandName, 'RuralShores')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.ruralshores.com/career.html')
  assert.equal(provider.officialCareersPageUrl, 'https://www.ruralshores.com/career.html')
  assert.equal(provider.companyDomain, 'ruralshores.com')
  assert.equal(provider.atsPlatform, 'first-party-html-board')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+html-jobcards+mailto-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /ruralshores[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.ruralshores\.com\/career\.html/i)
  assert.match(provider.verifiedSurfaceSummary, /Current Openings/i)
  assert.match(provider.verifiedSurfaceSummary, /Deputy Manager - Service Delivery/i)
  assert.match(provider.verifiedSurfaceSummary, /Assistant Manager - Projects/i)
  assert.match(provider.verifiedSurfaceSummary, /RSBS\/REC\/2026026/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'RuralShores'), false)

  assert.equal(ruralShores.PROVIDER_METADATA.source, RURALSHORES_CATALOG.source)
  assert.equal(ruralShores.PROVIDER_METADATA.companyName, RURALSHORES_CATALOG.companyName)
})

test('RuralShores exact backlog row matches directly from local provider metadata', async () => {
  const { RURALSHORES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'RuralShores\n',
    catalog: [hydrateProviderCatalogEntry(RURALSHORES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['RuralShores', 'ruralshores', 'RuralShores']],
  )
})

test('RuralShores hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { RURALSHORES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(RURALSHORES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'RuralShores')
  assert.equal(provider.companyCareerPage, 'https://www.ruralshores.com/career.html')
  assert.equal(provider.companyDomain, 'ruralshores.com')
  assert.equal(provider.atsPlatform, 'first-party-html-board')
  assert.match(provider.modulePath, /ruralshores[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /ruralshores[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
