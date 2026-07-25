import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../signeasy/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../signeasy/catalog.js')
  } catch {
    assert.fail('Expected SignEasy catalog module at ../signeasy/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../signeasy/script.js')
  } catch {
    assert.fail('Expected SignEasy scraper module at ../signeasy/script.js')
  }
}

test('SignEasy local catalog captures the verified first-party careers page with no trustworthy public jobs surface', async () => {
  const { SIGNEASY_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const signeasy = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SIGNEASY_CATALOG)

  assert.equal(defaultCatalog, SIGNEASY_CATALOG)
  assert.equal(provider.source, 'signeasy')
  assert.equal(provider.companyName, 'SignEasy')
  assert.equal(provider.officialBrandName, 'Signeasy')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://signeasy.com/careers')
  assert.equal(provider.officialCareersPageUrl, 'https://signeasy.com/careers')
  assert.equal(provider.companyDomain, 'signeasy.com')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-with-no-trustworthy-public-jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+no-trustworthy-public-job-listings',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /signeasy[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/signeasy\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /Apply Now/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public job/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'SignEasy'), false)

  assert.equal(signeasy.PROVIDER_METADATA.source, SIGNEASY_CATALOG.source)
  assert.equal(signeasy.PROVIDER_METADATA.companyName, SIGNEASY_CATALOG.companyName)
})

test('SignEasy exact backlog row matches directly from local provider metadata', async () => {
  const { SIGNEASY_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'SignEasy\n',
    catalog: [hydrateProviderCatalogEntry(SIGNEASY_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['SignEasy', 'signeasy', 'SignEasy']],
  )
})

test('SignEasy hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SIGNEASY_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SIGNEASY_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'SignEasy')
  assert.equal(provider.companyCareerPage, 'https://signeasy.com/careers')
  assert.equal(provider.companyDomain, 'signeasy.com')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-with-no-trustworthy-public-jobs')
  assert.match(provider.modulePath, /signeasy[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /signeasy[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
