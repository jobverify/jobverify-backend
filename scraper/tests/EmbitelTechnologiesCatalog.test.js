import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../embiteltechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../embiteltechnologies/catalog.js')
  } catch {
    assert.fail('Expected Embitel Technologies catalog module at ../embiteltechnologies/catalog.js')
  }
}

test('Embitel Technologies local catalog captures the verified public SenseHQ board contract', async () => {
  const { EMBITEL_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(EMBITEL_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, EMBITEL_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'embiteltechnologies')
  assert.equal(provider.companyName, 'Embitel Technologies')
  assert.equal(provider.officialBrandName, 'Embitel Technologies India Pvt. Ltd.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.embitel.com/')
  assert.equal(provider.companyCareerPage, 'https://embitel.sensehq.com/careers')
  assert.equal(provider.publicBoardUrl, 'https://embitel.sensehq.com/careers')
  assert.equal(provider.sampleJobUrl, 'https://embitel.sensehq.com/careers/jobs/55737')
  assert.equal(provider.companyDomain, 'embitel.com')
  assert.equal(provider.atsPlatform, 'sensehq')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-public-sensehq-board-root-page-only')
  assert.equal(provider.extractionStrategy, 'verified-sensehq-next-data-board+india-openings-only')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.verifiedPublicOpeningCount, 11)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /embiteltechnologies[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/embitel\.sensehq\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /11 open jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Security Lead -Incident Management/i)
})

test('Embitel Technologies exact backlog row resolves from the local provider contract', async () => {
  const { EMBITEL_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Embitel Technologies\n',
    catalog: [hydrateProviderCatalogEntry(EMBITEL_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Embitel Technologies', 'embiteltechnologies', 'Embitel Technologies']],
  )
})
