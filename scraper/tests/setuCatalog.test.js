import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../setu/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../setu/catalog.js')
  } catch {
    assert.fail('Expected Setu catalog module at ../setu/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../setu/script.js')
  } catch {
    assert.fail('Expected Setu scraper module at ../setu/script.js')
  }
}

test('Setu local catalog captures the verified first-party dynamic careers surface', async () => {
  const { SETU_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const setu = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SETU_CATALOG)

  assert.equal(defaultCatalog, SETU_CATALOG)
  assert.equal(provider.source, 'setu')
  assert.equal(provider.companyName, 'Setu')
  assert.equal(provider.officialBrandName, 'BrokenTusk Technologies Pvt. Ltd.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://setu.co/careers/')
  assert.equal(provider.officialCareersPageUrl, 'https://setu.co/careers/')
  assert.equal(provider.companyDomain, 'setu.co')
  assert.equal(provider.atsPlatform, 'first-party-dynamic-html-board')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-page-with-browser-rendered-openings')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+browser-rendered-openings+same-page-apply-anchors',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /setu[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/setu\.co\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /Fetching open roles/i)
  assert.match(provider.verifiedSurfaceSummary, /SDE - II Fullstack Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /SDE - II Backend Engineer/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Setu'), false)

  assert.equal(setu.PROVIDER_METADATA.source, SETU_CATALOG.source)
  assert.equal(setu.PROVIDER_METADATA.companyName, SETU_CATALOG.companyName)
})

test('Setu exact backlog row matches directly from local provider metadata', async () => {
  const { SETU_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Setu\n',
    catalog: [hydrateProviderCatalogEntry(SETU_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Setu', 'setu', 'Setu']],
  )
})

test('Setu hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SETU_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SETU_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Setu')
  assert.equal(provider.companyCareerPage, 'https://setu.co/careers/')
  assert.equal(provider.companyDomain, 'setu.co')
  assert.equal(provider.atsPlatform, 'first-party-dynamic-html-board')
  assert.match(provider.modulePath, /setu[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /setu[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
