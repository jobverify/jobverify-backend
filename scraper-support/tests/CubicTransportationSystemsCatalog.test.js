import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/cubictransportationsystems/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/cubictransportationsystems/catalog.js')
  } catch {
    assert.fail('Expected Cubic Transportation Systems catalog module at ../../scraper/cubictransportationsystems/catalog.js')
  }
}

test('Cubic Transportation Systems local catalog captures the verified Incapsula block, public Workday board, and CTS subset counts', async () => {
  const { CUBIC_TRANSPORTATION_SYSTEMS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(CUBIC_TRANSPORTATION_SYSTEMS_CATALOG)

  assert.equal(defaultCatalog, CUBIC_TRANSPORTATION_SYSTEMS_CATALOG)
  assert.equal(provider.source, 'cubictransportationsystems')
  assert.equal(provider.companyName, 'Cubic Transportation Systems')
  assert.equal(provider.officialBrandName, 'Cubic Transportation Systems')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.cubic.com/global-careers')
  assert.equal(provider.officialWorkdayBoardUrl, 'https://cubic.wd1.myworkdayjobs.com/cubic_global_careers/jobs')
  assert.equal(provider.companyDomain, 'cubic.com')
  assert.equal(provider.atsPlatform, 'workday-jobs-api-with-detail-jsonld')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'workday-cxs-offset-pagination-until-short-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-cubic-global-careers-handoff-or-incapsula-block+verified-workday-board+india-summary-candidate-filter+detail-jsonld-business-unit-filter',
  )
  assert.equal(provider.verifiedOn, '2026-08-01')
  assert.equal(provider.verifiedPublicJobCount, 87)
  assert.equal(provider.verifiedIndiaBoardJobCount, 35)
  assert.equal(provider.verifiedIndiaJobCount, 30)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, August 1, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /global-careers/i)
  assert.match(provider.verifiedSurfaceSummary, /Incapsula interstitial/i)
  assert.match(provider.verifiedSurfaceSummary, /87 public global postings/i)
  assert.match(provider.verifiedSurfaceSummary, /35 India-addressed postings/i)
  assert.match(provider.verifiedSurfaceSummary, /30 India postings/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Site Reliability Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /Head of Technology and Service Operations/i)
  assert.match(provider.verifiedSurfaceSummary, /cubic_global_careers\/jobs/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /cubictransportationsystems[\\/]jobs\.json$/i)
})

test('Cubic Transportation Systems exact backlog row resolves from local provider metadata', async () => {
  const { CUBIC_TRANSPORTATION_SYSTEMS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Cubic Transportation Systems\n',
    catalog: [hydrateProviderCatalogEntry(CUBIC_TRANSPORTATION_SYSTEMS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Cubic Transportation Systems hydrated local catalog stays script-runner compatible', async () => {
  const { CUBIC_TRANSPORTATION_SYSTEMS_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(CUBIC_TRANSPORTATION_SYSTEMS_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(typeof module.run, 'function')
})
