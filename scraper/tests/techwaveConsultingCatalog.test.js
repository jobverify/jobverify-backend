import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../techwaveconsulting/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../techwaveconsulting/catalog.js')
  } catch {
    assert.fail('Expected Techwave Consulting catalog module at ../techwaveconsulting/catalog.js')
  }
}

test('Techwave Consulting local catalog captures the verified first-party shell and Workday jobs API contract', async () => {
  const { TECHWAVE_CONSULTING_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TECHWAVE_CONSULTING_CATALOG)

  assert.equal(defaultCatalog, TECHWAVE_CONSULTING_CATALOG)
  assert.equal(provider.source, 'techwaveconsulting')
  assert.equal(provider.companyName, 'Techwave Consulting')
  assert.equal(provider.officialBrandName, 'Techwave')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.techwave.com/career/')
  assert.equal(provider.officialWorkdayBoardUrl, 'https://techwave.wd108.myworkdayjobs.com/TechWave_Careers')
  assert.equal(
    provider.jobsApiUrl,
    'https://techwave.wd108.myworkdayjobs.com/wday/cxs/techwave/TechWave_Careers/jobs',
  )
  assert.deepEqual(provider.verifiedIndiaLocationDescriptors, [
    'Bangalore',
    'GDC Financial District',
    'GDC HiTech',
    'Khammam',
  ])
  assert.equal(provider.companyDomain, 'techwave.com')
  assert.equal(provider.atsPlatform, 'workday-jobs-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-workday-jobs-api')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-shell+public-workday-board+india-location-facets+jobs-api',
  )
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Sr\. Data Architect \(Databricks\)/i)
  assert.match(provider.verifiedSurfaceSummary, /GDC Financial District/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /techwaveconsulting[\\/]jobs\.json$/i)
})

test('Techwave Consulting exact backlog row resolves from the local provider metadata', async () => {
  const { TECHWAVE_CONSULTING_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Techwave Consulting\n',
    catalog: [hydrateProviderCatalogEntry(TECHWAVE_CONSULTING_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Techwave Consulting', 'techwaveconsulting', 'Techwave Consulting']],
  )
})

test('Techwave Consulting hydrated local catalog stays script-runner compatible for later registry integration', async () => {
  const { TECHWAVE_CONSULTING_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TECHWAVE_CONSULTING_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.techwave.com/career/')
  assert.match(provider.modulePath, /techwaveconsulting[\\/]script\.js$/i)
  assert.equal(typeof module.run, 'function')
})
