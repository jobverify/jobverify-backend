import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const expectedModulePath = path.resolve(currentDir, '../../scraper/redingtonindia/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/redingtonindia/catalog.js')
  } catch {
    assert.fail('Expected Redington India catalog module at ../../scraper/redingtonindia/catalog.js')
  }
}

test('Redington India local catalog captures the verified first-party careers page and admin-ajax jobs surface', async () => {
  const { REDINGTON_INDIA_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(REDINGTON_INDIA_CATALOG)

  assert.equal(defaultCatalog, REDINGTON_INDIA_CATALOG)
  assert.equal(provider.source, 'redingtonindia')
  assert.equal(provider.companyName, 'Redington India')
  assert.equal(provider.officialBrandName, 'Redington')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://redingtongroup.com/careers/')
  assert.equal(provider.officialCareersPageUrl, 'https://redingtongroup.com/careers/')
  assert.equal(provider.jobsApiUrl, 'https://redingtongroup.com/wp-admin/admin-ajax.php')
  assert.equal(
    provider.jobDetailsUrlTemplate,
    'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/{jobId}?from=all',
  )
  assert.equal(provider.companyDomain, 'redingtongroup.com')
  assert.equal(provider.atsPlatform, 'wordpress-admin-ajax+darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'offset-based-admin-ajax-until-empty')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-admin-ajax-actions+darwinbox-detail-url-template',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /redingtonindia[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, expectedModulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/redingtongroup\.com\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/redingtongroup\.com\/wp-admin\/admin-ajax\.php/i)
  assert.match(provider.verifiedSurfaceSummary, /Area Sales Manager/i)
  assert.match(provider.verifiedSurfaceSummary, /Territory Sales Manager/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Redington India'), false)
})

test('Redington India exact backlog row matches directly from the local provider metadata', async () => {
  const { REDINGTON_INDIA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Redington India\n',
    catalog: [hydrateProviderCatalogEntry(REDINGTON_INDIA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Redington India', 'redingtonindia', 'Redington India']],
  )
})

test('Redington India hydrated local catalog stays script-runner compatible for later shared-registry integration', async () => {
  const { REDINGTON_INDIA_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(REDINGTON_INDIA_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Redington India')
  assert.equal(provider.companyCareerPage, 'https://redingtongroup.com/careers/')
  assert.equal(provider.companyDomain, 'redingtongroup.com')
  assert.equal(provider.atsPlatform, 'wordpress-admin-ajax+darwinbox')
  assert.match(provider.modulePath, /redingtonindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /redingtonindia[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
