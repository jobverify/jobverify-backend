import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/proventech/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/proventech/catalog.js')
  } catch {
    assert.fail('Expected Proventech catalog module at ../../scraper/proventech/catalog.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Proventech local catalog captures the verified first-party careers listings', async () => {
  const { PROVENTECH_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = buildCatalogReadyProvider(PROVENTECH_CATALOG)

  assert.equal(defaultCatalog, PROVENTECH_CATALOG)
  assert.equal(provider.source, 'proventech')
  assert.equal(provider.companyName, 'Proventech')
  assert.equal(provider.officialBrandName, 'ProvenTech')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://new.proventech.in/index?temp=index')
  assert.equal(provider.companyCareerPage, 'https://new.proventech.in/index?temp=career')
  assert.equal(provider.applyUrl, 'https://new.proventech.in/index?temp=career')
  assert.equal(provider.atsPlatform, 'official-first-party-role-cards')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page')
  assert.equal(provider.extractionStrategy, 'same-page-role-cards')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'proventech.in')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /SAP UI5\/Fiori Consultant/i)
  assert.match(provider.verifiedSurfaceSummary, /SAP ABAP Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /Documentum D2 Administrator/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /proventech[\\/]jobs\.json$/i)
})

test('Proventech exact backlog row resolves from the local provider contract', async () => {
  const { PROVENTECH_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Proventech\n',
    catalog: [buildCatalogReadyProvider(PROVENTECH_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Proventech', 'proventech', 'Proventech']],
  )
})
