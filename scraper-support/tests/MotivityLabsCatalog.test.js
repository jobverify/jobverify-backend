import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/motivitylabs/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/motivitylabs/catalog.js')
  } catch {
    assert.fail('Expected MotivityLabs catalog module at ../../scraper/motivitylabs/catalog.js')
  }
}

test('MotivityLabs local catalog captures the verified first-party openings hub and detail pages', async () => {
  const { MOTIVITYLABS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(MOTIVITYLABS_CATALOG)

  assert.equal(defaultCatalog, MOTIVITYLABS_CATALOG)
  assert.equal(provider.source, 'motivitylabs')
  assert.equal(provider.companyName, 'MotivityLabs')
  assert.equal(provider.officialBrandName, 'Motivity Labs')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://motivitylabs.com/careers/')
  assert.equal(provider.officialCareersPageUrl, 'https://motivitylabs.com/job-openings/')
  assert.equal(provider.companyDomain, 'motivitylabs.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-first-party-job-openings-pages')
  assert.equal(provider.extractionStrategy, 'verified-first-party-job-openings+same-domain-detail-pages')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-03')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /motivitylabs[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Monday, August 3, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Sr\.Test Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /Technical Solution Architect/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior AI\/ML & Gen AI Engineer/i)
})

test('MotivityLabs exact backlog row resolves from the local catalog entry', async () => {
  const { MOTIVITYLABS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'MotivityLabs\n',
    catalog: [hydrateProviderCatalogEntry(MOTIVITYLABS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['MotivityLabs', 'motivitylabs', 'MotivityLabs']],
  )
})
