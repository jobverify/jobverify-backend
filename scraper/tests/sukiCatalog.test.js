import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../suki/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../suki/catalog.js')
  } catch {
    assert.fail('Expected Suki catalog module at ../suki/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../suki/script.js')
  } catch {
    assert.fail('Expected Suki scraper module at ../suki/script.js')
  }
}

test('Suki local catalog captures the verified first-party careers page and fail-closed open positions shell', async () => {
  const { SUKI_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const suki = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SUKI_CATALOG)

  assert.equal(defaultCatalog, SUKI_CATALOG)
  assert.equal(provider.source, 'suki')
  assert.equal(provider.companyName, 'Suki')
  assert.equal(provider.officialBrandName, 'Suki AI, Inc.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.suki.ai/careers/')
  assert.equal(provider.officialCareersPageUrl, 'https://www.suki.ai/careers/')
  assert.equal(provider.officialCareersHandoffUrl, 'https://www.suki.ai/open-positions/')
  assert.equal(provider.companyDomain, 'suki.ai')
  assert.equal(provider.atsPlatform, 'first-party-open-positions-shell-unverifiable')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(
    provider.paginationStrategy,
    'verified-careers-page-plus-first-party-open-positions-shell-no-verifiable-public-board',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-first-party-open-positions-shell+fail-closed-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /suki[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.suki\.ai\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.suki\.ai\/open-positions\//i)
  assert.match(provider.verifiedSurfaceSummary, /Suki AI, Inc\./i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Suki'), false)

  assert.equal(suki.PROVIDER_METADATA.source, SUKI_CATALOG.source)
  assert.equal(suki.PROVIDER_METADATA.companyName, SUKI_CATALOG.companyName)
})

test('Suki exact backlog row matches directly from the local provider metadata', async () => {
  const { SUKI_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Suki\n',
    catalog: [hydrateProviderCatalogEntry(SUKI_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Suki', 'suki', 'Suki']],
  )
})

test('Suki hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SUKI_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SUKI_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Suki')
  assert.equal(provider.companyCareerPage, 'https://www.suki.ai/careers/')
  assert.equal(provider.companyDomain, 'suki.ai')
  assert.equal(provider.atsPlatform, 'first-party-open-positions-shell-unverifiable')
  assert.match(provider.modulePath, /suki[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /suki[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
