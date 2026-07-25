import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../netcorecloud/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../netcorecloud/catalog.js')
  } catch {
    assert.fail('Expected Netcore Cloud catalog module at ../netcorecloud/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../netcorecloud/script.js')
  } catch {
    assert.fail('Expected Netcore Cloud scraper module at ../netcorecloud/script.js')
  }
}

test('Netcore Cloud local catalog captures the verified redirect-shell sentinel contract', async () => {
  const { NETCORE_CLOUD_CATALOG } = await loadCatalogModule()
  const netcoreCloud = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(NETCORE_CLOUD_CATALOG)

  assert.equal(provider.source, 'netcorecloud')
  assert.equal(provider.companyName, 'Netcore Cloud')
  assert.equal(provider.officialBrandName, 'Netcore Cloud')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://netcorecloud.com/')
  assert.equal(provider.companyCareerPage, 'https://netcorecloud.com/careers')
  assert.equal(
    provider.companyCareersListUrl,
    'https://netcorecloud.com/careers-list?job_category=engineering',
  )
  assert.equal(provider.companyDomain, 'netcorecloud.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-redirect-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-careers-page-plus-careers-list-shell-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-careers-list-redirect-shell-or-403-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /netcorecloud[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/netcorecloud\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/netcorecloud\.com\/careers-list\?job_category=engineering/i)
  assert.match(provider.verifiedSurfaceSummary, /403/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)

  assert.equal(
    netcoreCloud.PROVIDER_METADATA.source,
    NETCORE_CLOUD_CATALOG.source,
  )
  assert.equal(
    netcoreCloud.PROVIDER_METADATA.companyName,
    NETCORE_CLOUD_CATALOG.companyName,
  )
  assert.equal(
    netcoreCloud.PROVIDER_METADATA.companyCareerPage,
    NETCORE_CLOUD_CATALOG.companyCareerPage,
  )
})

test('Netcore Cloud exact backlog row resolves directly from local provider metadata', async () => {
  const { NETCORE_CLOUD_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Netcore Cloud\n',
    catalog: [hydrateProviderCatalogEntry(NETCORE_CLOUD_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Netcore Cloud', 'netcorecloud', 'Netcore Cloud']],
  )
})

test('Netcore Cloud hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { NETCORE_CLOUD_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(NETCORE_CLOUD_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Netcore Cloud')
  assert.equal(provider.companyCareerPage, 'https://netcorecloud.com/careers')
  assert.equal(provider.companyDomain, 'netcorecloud.com')
  assert.match(provider.modulePath, /netcorecloud[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /netcorecloud[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
