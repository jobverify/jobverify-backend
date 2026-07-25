import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../syllable/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../syllable/catalog.js')
  } catch {
    assert.fail('Expected Syllable catalog module at ../syllable/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../syllable/script.js')
  } catch {
    assert.fail('Expected Syllable scraper module at ../syllable/script.js')
  }
}

test('Syllable local catalog captures the verified first-party careers page and linked Rippling board', async () => {
  const { SYLLABLE_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const syllable = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(SYLLABLE_CATALOG)

  assert.equal(defaultCatalog, SYLLABLE_CATALOG)
  assert.equal(provider.source, 'syllable')
  assert.equal(provider.companyName, 'Syllable')
  assert.equal(provider.officialBrandName, 'Syllable AI')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://syllable.ai/careers')
  assert.equal(provider.officialCareersPageUrl, 'https://syllable.ai/careers')
  assert.equal(provider.linkedJobsBoardUrl, 'https://ats.rippling.com/syllable-corporation/jobs')
  assert.equal(provider.linkedJobsBoardHost, 'ats.rippling.com')
  assert.equal(provider.linkedJobsBoardSlug, 'syllable-corporation')
  assert.equal(provider.companyDomain, 'syllable.ai')
  assert.equal(provider.atsPlatform, 'rippling')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-linked-rippling-board-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-rippling-board-page+india-job-detail-pages',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /syllable[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/syllable\.ai\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/ats\.rippling\.com\/syllable-corporation\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Software Engineer II/i)
  assert.match(provider.verifiedSurfaceSummary, /Mountain View, CA/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Syllable'), false)

  assert.equal(syllable.PROVIDER_METADATA.source, SYLLABLE_CATALOG.source)
  assert.equal(syllable.PROVIDER_METADATA.companyName, SYLLABLE_CATALOG.companyName)
  assert.equal(
    syllable.PROVIDER_METADATA.linkedJobsBoardUrl,
    SYLLABLE_CATALOG.linkedJobsBoardUrl,
  )
})

test('Syllable exact backlog row matches directly from local provider metadata', async () => {
  const { SYLLABLE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Syllable\n',
    catalog: [hydrateProviderCatalogEntry(SYLLABLE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Syllable', 'syllable', 'Syllable']],
  )
})

test('Syllable hydrated local catalog stays script-runner compatible for later shared-registry integration', async () => {
  const { SYLLABLE_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SYLLABLE_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Syllable')
  assert.equal(provider.companyCareerPage, 'https://syllable.ai/careers')
  assert.equal(provider.companyDomain, 'syllable.ai')
  assert.equal(provider.atsPlatform, 'rippling')
  assert.match(provider.modulePath, /syllable[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /syllable[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
