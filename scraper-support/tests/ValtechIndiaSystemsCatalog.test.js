import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/valtechindiasystems/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/valtechindiasystems/catalog.js')
  } catch {
    assert.fail('Expected Valtech India Systems catalog module at ../../scraper/valtechindiasystems/catalog.js')
  }
}

const buildProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Valtech India Systems local catalog captures the verified Valtech global careers-page contract', async () => {
  const { VALTECH_INDIA_SYSTEMS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = buildProvider(VALTECH_INDIA_SYSTEMS_CATALOG)

  assert.equal(defaultCatalog, VALTECH_INDIA_SYSTEMS_CATALOG)
  assert.equal(provider.source, 'valtechindiasystems')
  assert.equal(provider.companyName, 'Valtech India Systems')
  assert.equal(provider.officialBrandName, 'Valtech')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.valtech.com/en-in/career/')
  assert.equal(provider.companyCareerPage, 'https://www.valtech.com/en-in/career/')
  assert.equal(provider.sampleJobUrl, 'https://www.valtech.com/en-in/career/jobs/4944510101/')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-plus-greenhouse-apply-handoff')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-plus-detail-pages')
  assert.equal(provider.extractionStrategy, 'verified-careers-page-visible-job-links+first-party-detail-pages+india-filter')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'valtech.com')
  assert.equal(provider.verifiedOn, '2026-08-06')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, August 6, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /careers\.india\.valtech\.com/i)
  assert.match(provider.verifiedSurfaceSummary, /Bengaluru/i)
  assert.match(provider.verifiedSurfaceSummary, /Greenhouse/i)
})

test('Valtech India Systems exact backlog row resolves from the local provider contract', async () => {
  const { VALTECH_INDIA_SYSTEMS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Valtech India Systems\n',
    catalog: [buildProvider(VALTECH_INDIA_SYSTEMS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Valtech India Systems', 'valtechindiasystems', 'Valtech India Systems']],
  )
})
