import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../winmansoftware/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../winmansoftware/catalog.js')
  } catch {
    assert.fail('Expected Winman Software catalog module at ../winmansoftware/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../winmansoftware/script.js')
  } catch {
    assert.fail('Expected Winman Software scraper module at ../winmansoftware/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Winman Software local catalog captures the verified first-party experienced-candidates table', async () => {
  const { WINMAN_SOFTWARE_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const winman = await loadScriptModule()
  const provider = buildCatalogReadyProvider(WINMAN_SOFTWARE_CATALOG)

  assert.equal(defaultCatalog, WINMAN_SOFTWARE_CATALOG)
  assert.equal(provider.source, 'winmansoftware')
  assert.equal(provider.companyName, 'Winman Software')
  assert.equal(provider.officialBrandName, 'Winman Software')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.winmansoftware.com/')
  assert.equal(provider.companyCareerPage, 'https://www.winmansoftware.com/careers/experienced/')
  assert.equal(provider.applyUrl, 'https://winman.in/jobs/resumedetail.aspx')
  assert.equal(provider.atsPlatform, 'official-first-party-html-table')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page')
  assert.equal(provider.extractionStrategy, 'html-table')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'winmansoftware.com')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Accountant/i)
  assert.match(provider.verifiedSurfaceSummary, /Electrical Maintenance Supervisor/i)
  assert.match(provider.verifiedSurfaceSummary, /winman\.in\/jobs\/resumedetail\.aspx/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /winmansoftware[\\/]jobs\.json$/i)

  assert.equal(winman.PROVIDER_METADATA.source, provider.source)
  assert.equal(winman.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(winman.PROVIDER_METADATA.applyUrl, provider.applyUrl)
})

test('Winman Software exact backlog row resolves from the local provider contract', async () => {
  const { WINMAN_SOFTWARE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Winman Software\n',
    catalog: [buildCatalogReadyProvider(WINMAN_SOFTWARE_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Winman Software', 'winmansoftware', 'Winman Software']],
  )
})
