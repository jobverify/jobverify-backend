import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const ixigoModulePath = path.resolve(currentDir, '../ixigo/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../ixigo/catalog.js')
  } catch {
    assert.fail('Expected ixigo catalog module at ../ixigo/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../ixigo/script.js')
  } catch {
    assert.fail('Expected ixigo scraper module at ../ixigo/script.js')
  }
}

test('ixigo local catalog captures the verified no-public-jobs careers surface without alias churn', async () => {
  const { IXIGO_CATALOG } = await loadCatalogModule()
  const ixigo = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(IXIGO_CATALOG)

  assert.equal(provider.source, 'ixigo')
  assert.equal(provider.companyName, 'ixigo')
  assert.equal(provider.officialBrandName, 'ixigo')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.ixigo.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.ixigo.com/')
  assert.equal(provider.legacyCareersUrl, 'https://www.ixigo.com/about/careers/')
  assert.equal(provider.currentCareersUrl, 'https://careers.ixigo.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-legacy-careers-redirect-plus-no-public-jobs-sentinel')
  assert.equal(
    provider.extractionStrategy,
    'verified-legacy-careers-redirect+verified-current-careers-no-jobs-page-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'ixigo.com')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /ixigo[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.ixigo\.com\/about\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.ixigo\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /No Jobs Found/i)
  assert.match(provider.verifiedSurfaceSummary, /Recruiterflow/i)
  assert.match(provider.verifiedSurfaceSummary, /404/i)
  assert.equal(provider.modulePath, ixigoModulePath)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'ixigo'), false)

  assert.equal(ixigo.PROVIDER_METADATA.source, IXIGO_CATALOG.source)
  assert.equal(ixigo.PROVIDER_METADATA.companyName, IXIGO_CATALOG.companyName)
  assert.equal(ixigo.PROVIDER_METADATA.currentCareersUrl, IXIGO_CATALOG.currentCareersUrl)
})

test('ixigo backlog row matches directly from the local catalog without alias changes', async () => {
  const { IXIGO_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'ixigo\n',
    catalog: [hydrateProviderCatalogEntry(IXIGO_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ixigo', 'ixigo', 'ixigo']],
  )
})

test('getScraperCatalog includes ixigo as a verified no-public-jobs sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ixigo')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'ixigo')
  assert.equal(provider.companyCareerPage, 'https://careers.ixigo.com/')
  assert.equal(provider.companyDomain, 'ixigo.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.match(provider.modulePath, /ixigo[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable ixigo scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'ixigo')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'ixigo')
  assert.equal(scraper.provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.match(scraper.dryRunFile, /ixigo[\\/]jobs\.json$/i)
})
