import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../outlinesystems/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../outlinesystems/catalog.js')
  } catch {
    assert.fail('Expected Outline Systems catalog module at ../outlinesystems/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../outlinesystems/script.js')
  } catch {
    assert.fail('Expected Outline Systems scraper module at ../outlinesystems/script.js')
  }
}

test('Outline Systems local catalog captures the no-trustworthy-first-party-jobs state', async () => {
  const { OUTLINE_SYSTEMS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const outline = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(OUTLINE_SYSTEMS_CATALOG)

  assert.equal(defaultCatalog, OUTLINE_SYSTEMS_CATALOG)
  assert.equal(provider.source, 'outlinesystems')
  assert.equal(provider.companyName, 'Outline Systems')
  assert.equal(provider.officialBrandName, 'Outline Systems')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.outlinesys.com/')
  assert.equal(provider.companyCareerPage, 'https://www.outlinesys.com/careers')
  assert.equal(provider.companyDomain, 'outlinesys.com')
  assert.equal(provider.atsPlatform, 'no-trustworthy-first-party-jobs-surface')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'empty-sentinel')
  assert.equal(provider.extractionStrategy, 'no-verifiable-first-party-careers-surface-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /outlinesys\.com/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Outline Systems'), false)

  assert.equal(outline.PROVIDER_METADATA.source, OUTLINE_SYSTEMS_CATALOG.source)
  assert.equal(outline.PROVIDER_METADATA.companyCareerPage, OUTLINE_SYSTEMS_CATALOG.companyCareerPage)
})

test('Outline Systems exact backlog row resolves from the local provider contract', async () => {
  const { OUTLINE_SYSTEMS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Outline Systems\n',
    catalog: [hydrateProviderCatalogEntry(OUTLINE_SYSTEMS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Outline Systems', 'outlinesystems', 'Outline Systems']],
  )
})
