import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildScrapers, DEFAULT_PROVIDER_EXTENSION_DIR, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const SENTINEL_MODULE_PATH = '../workbookbatch07/failClosedSentinel.js'
const SHARED_DRY_RUN_DIR = path.resolve(currentDir, '../workbookbatch07')
const SHARD_PREFIX = 'workbook-batch-07-'
const EXPECTED_BATCH_COMPANIES = [
  'Banyan Cloud',
  'Wells Fargo Technology',
]

const slugifySource = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '')

const loadWorkbookBatch07Providers = () =>
  readdirSync(DEFAULT_PROVIDER_EXTENSION_DIR)
    .filter(
      (fileName) =>
        fileName.startsWith(SHARD_PREFIX)
        && fileName.toLowerCase().endsWith('.json'),
    )
    .sort((left, right) => left.localeCompare(right))
    .flatMap((fileName) =>
      JSON.parse(
        readFileSync(path.join(DEFAULT_PROVIDER_EXTENSION_DIR, fileName), 'utf8'),
      ),
    )

test('workbook batch 07 registers the expected exact-name sentinels', () => {
  const providers = loadWorkbookBatch07Providers()

  assert.equal(providers.length, EXPECTED_BATCH_COMPANIES.length)
  assert.deepEqual(
    providers.map((provider) => provider.companyName),
    EXPECTED_BATCH_COMPANIES,
  )

  for (const provider of providers) {
    const hydratedProvider = hydrateProviderCatalogEntry(provider)
    assert.equal(provider.source, slugifySource(provider.companyName))
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
    assert.equal(provider.verifiedOn, '2026-07-27')
    assert.equal(provider.verifiedPublicJobCount, 0)
    assert.equal(provider.verifiedIndiaJobCount, 0)
    assert.match(provider.verifiedSurfaceSummary, /Workbook batch 07 exact-name sentinel/i)
    assert.match(
      provider.verifiedSurfaceSummary,
      /Monday, July 27, 2026/,
    )
    assert.match(
      provider.verifiedSurfaceSummary,
      new RegExp(
        provider.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      ),
    )
    assert.equal(
      hydratedProvider.dryRunFile,
      path.join(SHARED_DRY_RUN_DIR, `${provider.source}.jobs.json`),
    )
  }
})

test('workbook batch 07 sentinel companies all resolve from the shared catalog', () => {
  const csvText = `company_name\n${EXPECTED_BATCH_COMPANIES.join('\n')}\n`
  const report = generateCompanyCoverageReport({
    csvText,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, EXPECTED_BATCH_COMPANIES.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.deepEqual(
    report.matched.map((item) => item.companyName),
    EXPECTED_BATCH_COMPANIES,
  )
})

test('workbook batch 07 sentinel scrapers stay registered and fail closed with zero jobs', async () => {
  const expectedSources = new Set(
    EXPECTED_BATCH_COMPANIES.map((companyName) => slugifySource(companyName)),
  )
  const scrapers = buildScrapers().filter((scraper) => expectedSources.has(scraper.name))

  assert.equal(scrapers.length, expectedSources.size)

  for (const scraper of scrapers) {
    assert.equal(scraper.provider.modulePath, SENTINEL_MODULE_PATH)
    assert.equal(scraper.provider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.deepEqual(await scraper.run(), [])
  }
})
