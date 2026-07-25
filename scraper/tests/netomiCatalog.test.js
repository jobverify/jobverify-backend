import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../netomi/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../netomi/catalog.js')
  } catch {
    assert.fail('Expected Netomi catalog module at ../netomi/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../netomi/script.js')
  } catch {
    assert.fail('Expected Netomi scraper module at ../netomi/script.js')
  }
}

test('Netomi local catalog captures the verified first-party careers page and Lever feed contract', async () => {
  const { NETOMI_CATALOG } = await loadCatalogModule()
  const netomi = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(NETOMI_CATALOG)

  assert.equal(provider.source, 'netomi')
  assert.equal(provider.companyName, 'Netomi')
  assert.equal(provider.officialBrandName, 'Netomi')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.netomi.com/')
  assert.equal(provider.companyCareerPage, 'https://www.netomi.com/careers')
  assert.equal(provider.companyDomain, 'netomi.com')
  assert.equal(provider.officialLeverBoardUrl, 'https://jobs.lever.co/netomi')
  assert.equal(provider.leverApiUrl, 'https://api.lever.co/v0/postings/netomi?mode=json')
  assert.equal(provider.verifiedPublicJobCount, 31)
  assert.equal(provider.verifiedIndiaJobCount, 19)
  assert.equal(
    provider.verifiedSampleJobUrl,
    'https://jobs.lever.co/netomi/ba379f47-091b-4f2d-82d3-e97a0821227e',
  )
  assert.equal(provider.atsPlatform, 'lever')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'official-careers-validation-plus-lever-api')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+embedded-lever-api+global-lever-postings',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /netomi[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.netomi\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/api\.lever\.co\/v0\/postings\/netomi\?mode=json/i)
  assert.match(provider.verifiedSurfaceSummary, /31 public jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /19 India roles/i)

  assert.equal(netomi.PROVIDER_METADATA.source, NETOMI_CATALOG.source)
  assert.equal(netomi.PROVIDER_METADATA.companyName, NETOMI_CATALOG.companyName)
  assert.equal(
    netomi.PROVIDER_METADATA.companyCareerPage,
    NETOMI_CATALOG.companyCareerPage,
  )
})

test('Netomi exact backlog row resolves directly from local provider metadata', async () => {
  const { NETOMI_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Netomi\n',
    catalog: [hydrateProviderCatalogEntry(NETOMI_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Netomi', 'netomi', 'Netomi']],
  )
})

test('Netomi hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { NETOMI_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(NETOMI_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Netomi')
  assert.equal(provider.companyCareerPage, 'https://www.netomi.com/careers')
  assert.equal(provider.companyDomain, 'netomi.com')
  assert.match(provider.modulePath, /netomi[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /netomi[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
