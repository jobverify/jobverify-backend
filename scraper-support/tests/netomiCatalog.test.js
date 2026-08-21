import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/netomi/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/netomi/catalog.js')
  } catch {
    assert.fail('Expected Netomi catalog module at ../../scraper/netomi/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/netomi/script.js')
  } catch {
    assert.fail('Expected Netomi scraper module at ../../scraper/netomi/script.js')
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
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(provider.verifiedIndiaJobCount, 0)
  assert.equal(provider.verifiedSampleJobUrl, null)
  assert.equal(provider.atsPlatform, 'lever')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(
    provider.paginationStrategy,
    'official-careers-validation-plus-lever-api-or-referral-homepage-empty-state',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+embedded-lever-api+global-lever-postings|verified-referral-homepage-redirect-empty-state',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-15')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /netomi[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, August 15, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.netomi\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.netomi\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/api\.lever\.co\/v0\/postings\/netomi\?mode=json/i)
  assert.match(provider.verifiedSurfaceSummary, /22 public jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /returns \[\]/i)

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
