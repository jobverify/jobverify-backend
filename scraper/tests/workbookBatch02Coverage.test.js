import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import workbookBatch02Aliases from '../providers/companyAliasExtensions/workbook-batch-02.json' with { type: 'json' }
import workbookBatch02Providers from '../providers/providerExtensions/workbook-batch-02.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const batchManifest = JSON.parse(
  readFileSync(path.resolve(currentDir, '../../../artifacts/workbook-batches/workbook-batch-02.json'), 'utf8'),
)

const SENTINEL_MODULE_PATH = '../workbookbatch02/failClosedSentinel.js'
const SHARED_DRY_RUN_DIR = path.resolve(currentDir, '../workbookbatch02')
const EXPECTED_ALIAS_MAP = {
  Cibil: 'transunioncibil',
}
const EXPECTED_SENTINEL_COMPANIES = [
  ['Zimyo', 'zimyo'],
  ['Ziptrax', 'ziptrax'],
  ['Zivame', 'zivame'],
  ['ZoomCar', 'zoomcar'],
  ['AdPushup', 'adpushup'],
  ['Akasa Air Digital', 'akasaairdigital'],
  ['Alaan', 'alaan'],
  ['Allo Health', 'allohealth'],
  ['Amberstudent', 'amberstudent'],
  ['Amrutam', 'amrutam'],
  ['Anomalo India', 'anomaloindia'],
  ['APISero', 'apisero'],
  ['Aranca', 'aranca'],
  ['Arcatron Mobility', 'arcatronmobility'],
  ['Arivihan', 'arivihan'],
  ['Arna Health', 'arnahealth'],
  ['Artoo', 'artoo'],
  ['Artium Academy', 'artiumacademy'],
  ['Basepair', 'basepair'],
  ['BetterPlace', 'betterplace'],
  ['Bhive', 'bhive'],
  ['Bluelearn', 'bluelearn'],
  ['BluSmart', 'blusmart'],
  ['Bolo Live', 'bololive'],
  ['Bounce', 'bounce'],
  ['Brij', 'brij'],
  ['Catamaran', 'catamaran'],
  ['CoRover', 'corover'],
  ['Collabera Digital', 'collaberadigital'],
  ['Contour Software India', 'contoursoftwareindia'],
  ['DaMENSCH', 'damensch'],
  ['DhiWise', 'dhiwise'],
  ['DoctorC', 'doctorc'],
  ['Easetec', 'easetec'],
]

test('workbook batch 02 registers exact-name sentinel providers and the scoped Cibil alias only', () => {
  assert.deepEqual(workbookBatch02Aliases, EXPECTED_ALIAS_MAP)
  assert.deepEqual(
    workbookBatch02Providers.map((provider) => [provider.companyName, provider.source]),
    EXPECTED_SENTINEL_COMPANIES,
  )

  for (const provider of workbookBatch02Providers) {
    const hydratedProvider = hydrateProviderCatalogEntry(provider)
    assert.equal(provider.adapter, 'script')
    assert.equal(provider.modulePath, SENTINEL_MODULE_PATH)
    assert.equal(provider.companyCareerPage, undefined)
    assert.equal(provider.companyDomain, undefined)
    assert.equal(provider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(provider.countryFilter, 'India')
    assert.equal(provider.paginationStrategy, 'none')
    assert.equal(
      provider.extractionStrategy,
      'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified',
    )
    assert.equal(provider.parser, 'custom-script')
    assert.equal(provider.normalizationProfile, 'engineering-default')
    assert.match(provider.verifiedSurfaceSummary, /exact-name sentinel/i)
    assert.match(provider.verifiedSurfaceSummary, new RegExp(provider.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.equal(
      hydratedProvider.dryRunFile,
      path.join(SHARED_DRY_RUN_DIR, `${provider.source}.jobs.json`),
    )
  }
})

test('workbook batch 02 manifest resolves fully from the shared catalog with no unmatched companies', () => {
  const csvText = `company_name\n${batchManifest.companies.join('\n')}\n`
  const report = generateCompanyCoverageReport({
    csvText,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, batchManifest.total)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.equal(
    report.matched.find((item) => item.companyName === 'Cibil')?.source,
    'transunioncibil',
  )
  assert.deepEqual(
    report.matched
      .filter((item) => item.companyName !== 'Cibil')
      .map((item) => [item.companyName, item.source]),
    EXPECTED_SENTINEL_COMPANIES,
  )
})

test('workbook batch 02 sentinel scrapers stay registered and fail closed with zero jobs', async () => {
  const expectedSources = EXPECTED_SENTINEL_COMPANIES.map(([, source]) => source)
  const scrapers = buildScrapers().filter((scraper) => expectedSources.includes(scraper.name))

  assert.equal(scrapers.length, expectedSources.length)

  for (const scraper of scrapers) {
    assert.equal(scraper.provider.modulePath, SENTINEL_MODULE_PATH)
    assert.equal(scraper.provider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.deepEqual(await scraper.run(), [])
  }
})
