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

test('Valtech India Systems local catalog captures the verified Teamtailor-backed first-party jobs surface', async () => {
  const { VALTECH_INDIA_SYSTEMS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = buildProvider(VALTECH_INDIA_SYSTEMS_CATALOG)

  assert.equal(defaultCatalog, VALTECH_INDIA_SYSTEMS_CATALOG)
  assert.equal(provider.source, 'valtechindiasystems')
  assert.equal(provider.companyName, 'Valtech India Systems')
  assert.equal(provider.officialBrandName, 'Valtech India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://careers.india.valtech.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.india.valtech.com/jobs')
  assert.equal(provider.sampleJobUrl, 'https://careers.india.valtech.com/jobs/5421672-java-lead-developer')
  assert.equal(provider.atsPlatform, 'teamtailor')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-teamtailor-listing-page')
  assert.equal(provider.extractionStrategy, 'verified-teamtailor-job-listing+first-party-detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.india.valtech.com')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Teamtailor/i)
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
