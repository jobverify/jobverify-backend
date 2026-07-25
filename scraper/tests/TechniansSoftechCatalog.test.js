import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../technianssoftech/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../technianssoftech/catalog.js')
  } catch {
    assert.fail('Expected Technians Softech catalog module at ../technianssoftech/catalog.js')
  }
}

test('Technians Softech local catalog captures the verified Nians first-party openings form contract', async () => {
  const { TECHNIANS_SOFTECH_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TECHNIANS_SOFTECH_CATALOG)

  assert.equal(defaultCatalog, TECHNIANS_SOFTECH_CATALOG)
  assert.equal(provider.source, 'technianssoftech')
  assert.equal(provider.companyName, 'Technians Softech')
  assert.equal(provider.officialBrandName, 'Nians')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://nians.com/job/')
  assert.equal(provider.companyDomain, 'nians.com')
  assert.equal(provider.atsPlatform, 'official-company-jobs-form')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page-role-select-options')
  assert.equal(
    provider.extractionStrategy,
    'verified-roles-page+designation-select-options+shared-application-form',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Technians is now Nians/i)
  assert.match(provider.verifiedSurfaceSummary, /Technology\/ IT department \(1\)/i)
  assert.match(provider.verifiedSurfaceSummary, /Trainee - Social Media/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /technianssoftech[\\/]jobs\.json$/i)
})

test('Technians Softech exact backlog row resolves from local provider metadata', async () => {
  const { TECHNIANS_SOFTECH_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Technians Softech\n',
    catalog: [hydrateProviderCatalogEntry(TECHNIANS_SOFTECH_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Technians Softech hydrated local catalog stays script-runner compatible', async () => {
  const { TECHNIANS_SOFTECH_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TECHNIANS_SOFTECH_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(typeof module.run, 'function')
})
