import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../dagster/catalog.js')
  } catch {
    assert.fail('Expected Dagster catalog module at ../dagster/catalog.js')
  }
}

const loadDagsterModule = async () => {
  try {
    return await import('../dagster/script.js')
  } catch {
    assert.fail('Expected Dagster scraper module at ../dagster/script.js')
  }
}

test('Dagster local catalog captures the verified official careers page and empty Greenhouse board surface', async () => {
  const { DAGSTER_CATALOG } = await loadCatalogModule()
  const dagster = await loadDagsterModule()
  const provider = hydrateProviderCatalogEntry(DAGSTER_CATALOG)

  assert.equal(provider.source, 'dagster')
  assert.equal(provider.companyName, 'Dagster')
  assert.equal(provider.officialBrandName, 'Dagster Labs')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://dagster.io/company/careers')
  assert.equal(provider.greenhouseBoardUrl, 'https://job-boards.greenhouse.io/dagsterlabs')
  assert.equal(provider.companyDomain, 'dagster.io')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(provider.verifiedIndiaJobCount, 0)
  assert.equal(provider.atsPlatform, 'greenhouse-empty-board')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'single-official-careers-page-plus-empty-greenhouse-board',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-empty-greenhouse-board+return-empty-until-board-changes',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /dagster[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /dagster[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dagster\.io\/company\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/job-boards\.greenhouse\.io\/dagsterlabs/i)
  assert.match(provider.verifiedSurfaceSummary, /not currently hiring/i)
  assert.match(provider.verifiedSurfaceSummary, /no current openings/i)

  assert.equal(dagster.PROVIDER_METADATA.source, provider.source)
  assert.equal(dagster.CAREERS_URL, provider.companyCareerPage)
  assert.equal(dagster.GREENHOUSE_BOARD_URL, provider.greenhouseBoardUrl)
})

test('getScraperCatalog and buildScrapers expose Dagster as a runnable empty-board provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dagster')
  const scraper = buildScrapers().find((item) => item.name === 'dagster')

  assert.ok(provider, 'Expected Dagster provider to be registered in customProviders.json')
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Dagster')
  assert.equal(provider.companyCareerPage, 'https://dagster.io/company/careers')
  assert.equal(provider.greenhouseBoardUrl, 'https://job-boards.greenhouse.io/dagsterlabs')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /dagster[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'dagster')
  assert.equal(scraper.provider.atsPlatform, 'greenhouse-empty-board')
})
