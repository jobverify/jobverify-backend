import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../vanta/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../vanta/catalog.js')
  } catch {
    assert.fail('Expected Vanta catalog module at ../vanta/catalog.js')
  }
}

test('Vanta local catalog captures the verified first-party careers pagination surface', async () => {
  const { VANTA_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(VANTA_CATALOG)

  assert.equal(defaultCatalog, VANTA_CATALOG)
  assert.equal(provider.source, 'vanta')
  assert.equal(provider.companyName, 'Vanta')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.vanta.com/company/careers')
  assert.equal(provider.companyDomain, 'vanta.com')
  assert.equal(provider.atsPlatform, 'official-first-party-webflow-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-webflow-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-pages+browser-rendered-role-cards+india-filter',
  )
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /\?9a22bd08_page=2/i)
  assert.match(provider.verifiedSurfaceSummary, /No open position found/i)
  assert.match(provider.verifiedSurfaceSummary, /zero India-visible openings/i)
})

test('Vanta is registered in the scraper catalog through customProviders metadata', () => {
  const provider = getScraperCatalog().find((entry) => entry.source === 'vanta')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Vanta')
  assert.equal(provider.companyCareerPage, 'https://www.vanta.com/company/careers')
  assert.equal(provider.atsPlatform, 'official-first-party-webflow-careers')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.equal(path.resolve(currentDir, provider.modulePath), modulePath)
})
