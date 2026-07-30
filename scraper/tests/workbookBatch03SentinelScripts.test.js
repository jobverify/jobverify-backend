import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const providerExtensions = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../providers/providerExtensions/workbook-batch-03.json'),
    'utf8',
  ),
)
const SENTINEL_MODULE_PATH = '../workbookbatch03/failClosedSentinel.js'
const SENTINEL_EXTRACTION_STRATEGY =
  'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified'

test('Workbook batch 03 sentinel providers remain exact-name, verified, and fail closed', async () => {
  const sources = providerExtensions.map(({ source }) => source)
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))

  assert.deepEqual(
    sources.map((source) => catalog.find((provider) => provider.source === source)?.companyName ?? null),
    providerExtensions.map(({ companyName }) => companyName),
  )

  for (const providerExtension of providerExtensions) {
    const provider = catalog.find((item) => item.source === providerExtension.source)
    const scraper = scrapersByName.get(providerExtension.source)

    assert.ok(provider)
    assert.ok(scraper)
    assert.equal(provider.companyName, providerExtension.companyName)
    assert.equal(provider.modulePath, SENTINEL_MODULE_PATH)
    assert.equal(provider.dryRunFile, path.resolve(currentDir, `../workbookbatch03/${provider.source}.jobs.json`))
    assert.equal(provider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.equal(provider.countryFilter, 'India')
    assert.equal(provider.paginationStrategy, 'none')
    assert.equal(provider.extractionStrategy, SENTINEL_EXTRACTION_STRATEGY)
    assert.equal(provider.parser, 'custom-script')
    assert.equal(provider.normalizationProfile, 'engineering-default')
    assert.equal(provider.verifiedOn, '2026-07-25')
    assert.equal(provider.verifiedPublicJobCount, 0)
    assert.equal(provider.verifiedIndiaJobCount, 0)
    assert.equal(provider.companyCareerPage, null)
    assert.equal(provider.companyDomain, null)
    assert.match(provider.verifiedSurfaceSummary, /exact-name sentinel/i)
    assert.match(
      provider.verifiedSurfaceSummary,
      new RegExp(provider.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    )
    assert.deepEqual(await scraper.run(), [])
  }
})
