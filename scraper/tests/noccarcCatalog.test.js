import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../noccarc/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../noccarc/catalog.js')
  } catch {
    assert.fail('Expected Noccarc catalog module at ../noccarc/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../noccarc/script.js')
  } catch {
    assert.fail('Expected Noccarc scraper module at ../noccarc/script.js')
  }
}

test('Noccarc local catalog captures the verified first-party careers page and outbound role links', async () => {
  const { NOCCARC_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const noccarc = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(NOCCARC_CATALOG)

  assert.equal(defaultCatalog, NOCCARC_CATALOG)
  assert.equal(provider.source, 'noccarc')
  assert.equal(provider.companyName, 'Noccarc')
  assert.equal(provider.officialBrandName, 'Noccarc Robotics Pvt Ltd')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.noccarc.com/careers')
  assert.equal(provider.publicJobListingHost, 'naukri.com')
  assert.equal(provider.companyDomain, 'noccarc.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'single-page-listing-with-first-party-outbound-role-links',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+outbound-naukri-role-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /noccarc[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.noccarc\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /naukri\.com/i)
  assert.match(provider.verifiedSurfaceSummary, /Regional Sales Manager - South/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Firmware Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /UI\/UX Designer/i)

  assert.equal(noccarc.PROVIDER_METADATA.source, NOCCARC_CATALOG.source)
  assert.equal(noccarc.PROVIDER_METADATA.companyName, NOCCARC_CATALOG.companyName)
  assert.equal(noccarc.PROVIDER_METADATA.companyCareerPage, NOCCARC_CATALOG.companyCareerPage)
})

test('Noccarc exact backlog row matches directly from local provider metadata', async () => {
  const { NOCCARC_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Noccarc\n',
    catalog: [hydrateProviderCatalogEntry(NOCCARC_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Noccarc', 'noccarc', 'Noccarc']],
  )
})

test('Noccarc hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { NOCCARC_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(NOCCARC_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Noccarc')
  assert.equal(provider.companyCareerPage, 'https://www.noccarc.com/careers')
  assert.equal(provider.companyDomain, 'noccarc.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.match(provider.modulePath, /noccarc[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /noccarc[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
