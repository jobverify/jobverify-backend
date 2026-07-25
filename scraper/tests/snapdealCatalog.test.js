import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../snapdeal/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../snapdeal/catalog.js')
  } catch {
    assert.fail('Expected Snapdeal catalog module at ../snapdeal/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../snapdeal/script.js')
  } catch {
    assert.fail('Expected Snapdeal scraper module at ../snapdeal/script.js')
  }
}

test('Snapdeal local catalog captures the verified homepage footer handoff to Darwinbox', async () => {
  const { SNAPDEAL_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const snapdeal = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SNAPDEAL_CATALOG)

  assert.equal(defaultCatalog, SNAPDEAL_CATALOG)
  assert.equal(provider.source, 'snapdeal')
  assert.equal(provider.companyName, 'Snapdeal')
  assert.equal(provider.officialBrandName, 'Snapdeal')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.snapdeal.com/')
  assert.equal(provider.officialCareersPageUrl, 'https://www.snapdeal.com/')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://snapdeal.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(provider.darwinboxOrigin, 'https://snapdeal.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.companyDomain, 'snapdeal.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'official-homepage-footer-careers-link+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /snapdeal[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.snapdeal\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/snapdeal\.darwinbox\.in\/ms\/candidate\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /Careers/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Snapdeal'), false)

  assert.equal(snapdeal.PROVIDER_METADATA.source, SNAPDEAL_CATALOG.source)
  assert.equal(snapdeal.PROVIDER_METADATA.companyName, SNAPDEAL_CATALOG.companyName)
})

test('Snapdeal exact backlog row matches directly from local provider metadata', async () => {
  const { SNAPDEAL_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Snapdeal\n',
    catalog: [hydrateProviderCatalogEntry(SNAPDEAL_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Snapdeal', 'snapdeal', 'Snapdeal']],
  )
})

test('Snapdeal hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SNAPDEAL_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SNAPDEAL_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Snapdeal')
  assert.equal(provider.companyCareerPage, 'https://www.snapdeal.com/')
  assert.equal(provider.companyDomain, 'snapdeal.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.match(provider.modulePath, /snapdeal[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /snapdeal[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
