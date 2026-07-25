import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../xcaliberinfotech/script.js')

const blockedCareersHtml = `
<html>
  <title>You are being redirected...</title>
  <noscript>Javascript is required. Please enable javascript before you are allowed to see this page.</noscript>
  <script>var sucuri_cloudproxy_js='enabled';</script>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../xcaliberinfotech/catalog.js')
  } catch {
    assert.fail('Expected Xcaliber Infotech catalog module at ../xcaliberinfotech/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../xcaliberinfotech/script.js')
  } catch {
    assert.fail('Expected Xcaliber Infotech scraper module at ../xcaliberinfotech/script.js')
  }
}

test('Xcaliber Infotech local catalog captures the verified fail-closed careers-shell contract', async () => {
  const { XCALIBER_INFOTECH_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const xcaliber = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(XCALIBER_INFOTECH_CATALOG)

  assert.equal(defaultCatalog, XCALIBER_INFOTECH_CATALOG)
  assert.equal(provider.source, 'xcaliberinfotech')
  assert.equal(provider.companyName, 'Xcaliber Infotech')
  assert.equal(provider.officialBrandName, 'Xcaliber Infotech Pvt. Ltd.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://xcaliberinfotech.com/')
  assert.equal(provider.companyCareerPage, 'https://xcaliberinfotech.com/search-jobs/')
  assert.equal(provider.companyDomain, 'xcaliberinfotech.com')
  assert.equal(provider.atsPlatform, 'sucuri-blocked-first-party-careers-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'fail-closed-sucuri-interstitial')
  assert.equal(
    provider.extractionStrategy,
    'verified-direct-fetch-sucuri-interstitial+browser-visible-empty-careers-shell+fail-closed-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /xcaliberinfotech[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Search For Open Positions/i)
  assert.match(provider.verifiedSurfaceSummary, /You are being redirected/i)

  assert.equal(xcaliber.hasVerifiedBlockedCareersSignal(blockedCareersHtml), true)
  const jobs = await xcaliber.run({
    fetchText: async () => blockedCareersHtml,
  })
  assert.deepEqual(jobs, [])
})

test('Xcaliber Infotech exact backlog row resolves from the local provider contract', async () => {
  const { XCALIBER_INFOTECH_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Xcaliber Infotech\n',
    catalog: [hydrateProviderCatalogEntry(XCALIBER_INFOTECH_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Xcaliber Infotech', 'xcaliberinfotech', 'Xcaliber Infotech']],
  )
})

test('Xcaliber Infotech hydrated local catalog stays script-runner compatible for later registry integration', async () => {
  const { XCALIBER_INFOTECH_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(XCALIBER_INFOTECH_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://xcaliberinfotech.com/search-jobs/')
  assert.equal(provider.companyDomain, 'xcaliberinfotech.com')
  assert.match(provider.modulePath, /xcaliberinfotech[\\/]script\.js$/i)
  assert.equal(typeof module.run, 'function')
})
