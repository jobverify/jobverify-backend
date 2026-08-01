import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/homelane/catalog.js')
  } catch {
    assert.fail('Expected HomeLane catalog module at ../../scraper/homelane/catalog.js')
  }
}

test('HomeLane local catalog captures the verified first-party Sentinel jobs surface', async () => {
  const { HOMELANE_CATALOG } = await loadCatalogModule()
  const provider = getScraperCatalog().find((item) => item.source === 'homelane')

  assert.ok(provider, 'Expected HomeLane provider to be registered in customProviders.json')
  assert.equal(provider.source, HOMELANE_CATALOG.source)
  assert.equal(provider.companyName, 'HomeLane')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://sentinel.homelane.com/jobs')
  assert.equal(provider.companyDomain, 'sentinel.homelane.com')
  assert.equal(provider.atsPlatform, 'first-party-nextjs-jobs-index')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-server-rendered-jobs-index-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-jobs-index+server-rendered-role-cards+detail-page-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.verifiedSurfaceSummary, /sentinel\.homelane\.com\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /15 open roles/i)
  assert.match(provider.modulePath, /homelane[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /homelane[\\/]jobs\.json$/i)
})

test('buildScrapers exposes a runnable HomeLane scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'homelane')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /homelane[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'homelane')
  assert.equal(scraper.provider.companyCareerPage, 'https://sentinel.homelane.com/jobs')
  assert.equal(scraper.provider.atsPlatform, 'first-party-nextjs-jobs-index')
})
