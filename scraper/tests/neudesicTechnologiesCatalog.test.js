import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../neudesictechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../neudesictechnologies/catalog.js')
  } catch {
    assert.fail('Expected Neudesic Technologies catalog module at ../neudesictechnologies/catalog.js')
  }
}

test('Neudesic Technologies local catalog captures the first-party careers shell that hands region openings to LinkedIn', async () => {
  const { NEUDESIC_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(NEUDESIC_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, NEUDESIC_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'neudesictechnologies')
  assert.equal(provider.companyName, 'Neudesic Technologies')
  assert.equal(provider.officialBrandName, 'Neudesic')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.neudesic.com/careers/')
  assert.equal(provider.companyDomain, 'neudesic.com')
  assert.equal(provider.atsPlatform, 'official-company-site-third-party-region-links')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-careers-page-region-link-handoff')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-shell+linkedin-region-links+no-first-party-job-listings',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Search India Openings by Region/i)
  assert.match(provider.verifiedSurfaceSummary, /LinkedIn/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /neudesictechnologies[\\/]jobs\.json$/i)
})
