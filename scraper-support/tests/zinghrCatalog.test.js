import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/zinghr/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/zinghr/catalog.js')
  } catch {
    assert.fail('Expected ZingHR catalog module at ../../scraper/zinghr/catalog.js')
  }
}

test('ZingHR local catalog captures the verified first-party jobs surface', async () => {
  const { ZINGHR_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ZINGHR_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(defaultCatalog, ZINGHR_CATALOG)
  assert.equal(provider.source, 'zinghr')
  assert.equal(provider.companyName, 'ZingHR')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.zinghr.com/job-openings/')
  assert.equal(provider.companyDomain, 'zinghr.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page-role-index+detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-job-openings-page+detail-pages+first-party-application-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-01')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, August 1, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.zinghr\.com\/job-openings\//i)
  assert.match(provider.verifiedSurfaceSummary, /Customer Support- \(HRMS\/HCM\)/i)
  assert.match(provider.verifiedSurfaceSummary, /Sales Manager/i)
  assert.match(provider.verifiedSurfaceSummary, /Key Job Traits/i)
  assert.equal(provider.openingCount, 5)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /zinghr[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})

test('ZingHR exact backlog row resolves from the local provider metadata without aliases', async () => {
  const { ZINGHR_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'ZingHR\n',
    catalog: [hydrateProviderCatalogEntry(ZINGHR_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ZingHR', 'zinghr', 'ZingHR']],
  )
})
