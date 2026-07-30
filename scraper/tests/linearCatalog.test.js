import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../linear/catalog.js')
  } catch {
    assert.fail('Expected Linear catalog module at ../linear/catalog.js')
  }
}

test('getScraperCatalog includes Linear as a first-party script provider pinned to the verified careers page', async () => {
  const { LINEAR_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = getScraperCatalog().find((item) => item.source === 'linear')

  assert.equal(defaultCatalog, LINEAR_CATALOG)
  assert.ok(provider, 'Expected Linear provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Linear')
  assert.equal(provider.officialBrandName, 'Linear')
  assert.equal(provider.companyCareerPage, 'https://linear.app/careers')
  assert.equal(provider.companyDomain, 'linear.app')
  assert.equal(provider.atsPlatform, 'official-first-party-careers-page')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-open-roles-page-current-empty-india-slice')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-open-roles-page+same-domain-role-links+return-empty-when-no-india-locations',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /linear[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /linear[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/linear\.app\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /\b20 open roles\b/i)
  assert.match(provider.verifiedSurfaceSummary, /zero India locations/i)
})

test('buildScrapers exposes a runnable Linear scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'linear')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /linear[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'linear')
  assert.equal(scraper.provider.companyCareerPage, 'https://linear.app/careers')
})
