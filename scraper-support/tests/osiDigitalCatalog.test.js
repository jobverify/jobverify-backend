import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/osidigital/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/osidigital/catalog.js')
  } catch {
    assert.fail('Expected OSI Digital catalog module at ../../scraper/osidigital/catalog.js')
  }
}

test('OSI Digital local catalog captures the first-party careers page that uses a resume form instead of structured openings', async () => {
  const { OSI_DIGITAL_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(OSI_DIGITAL_CATALOG)

  assert.equal(defaultCatalog, OSI_DIGITAL_CATALOG)
  assert.equal(provider.source, 'osidigital')
  assert.equal(provider.companyName, 'OSI Digital')
  assert.equal(provider.officialBrandName, 'OSI Digital')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://osidigital.com/careers/')
  assert.equal(provider.companyDomain, 'osidigital.com')
  assert.equal(provider.atsPlatform, 'official-company-site-resume-form')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-careers-page-resume-form')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+resume-form+linkedin-handoff+no-structured-openings',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Current Opportunities/i)
  assert.match(provider.verifiedSurfaceSummary, /submit your resume below/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /osidigital[\\/]jobs\.json$/i)
})
