import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import dedicatedProviders from '../providers/providerExtensions/zz-dedicated-scraper-folder-backfill.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const scraperDir = path.resolve(currentDir, '..', '..', 'scraper')
const manifest = {
  companies: dedicatedProviders
    .filter((provider) => String(provider.originalModulePath || '').startsWith('../../scraper/workbookbatch03/'))
    .map((provider) => provider.companyName),
}
const providersBySource = new Map(dedicatedProviders.map((provider) => [provider.source, provider]))
const LIVE_SOURCES = new Set(['housr', 'locus'])
const SENTINEL_EXTRACTION_STRATEGY =
  'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified'
const scriptModulePathFor = (source) => `../${source}/script.js`

test('Workbook batch 03 sentinel providers remain exact-name, verified, and fail closed', async () => {
  const catalog = getScraperCatalog()
  const scrapersByName = new Map(buildScrapers().map((scraper) => [scraper.name, scraper]))
  const report = generateCompanyCoverageReport({
    csvText: ['company_name', ...manifest.companies].join('\n'),
    catalog,
  })
  const providerExtensions = report.matched
    .filter(({ source }) => !LIVE_SOURCES.has(source))
    .map(({ source }) => providersBySource.get(source))

  assert.equal(providerExtensions.length, manifest.companies.length - LIVE_SOURCES.size)

  for (const providerExtension of providerExtensions) {
    const provider = catalog.find((item) => item.source === providerExtension.source)
    const scraper = scrapersByName.get(providerExtension.source)

    assert.ok(provider)
    assert.ok(scraper)
    assert.equal(provider.companyName, providerExtension.companyName)
    assert.equal(provider.modulePath, scriptModulePathFor(provider.source))
    assert.equal(provider.originalModulePath, '../../scraper/workbookbatch03/failClosedSentinel.js')
    assert.equal(provider.dryRunFile, path.join(scraperDir, provider.source, 'jobs.json'))
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
