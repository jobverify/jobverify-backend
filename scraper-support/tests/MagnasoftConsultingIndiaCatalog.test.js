import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/magnasoftconsultingindia/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/magnasoftconsultingindia/catalog.js')
  } catch {
    assert.fail('Expected Magnasoft Consulting India catalog module at ../../scraper/magnasoftconsultingindia/catalog.js')
  }
}

test('Magnasoft Consulting India catalog captures the verified first-party careers shell without public job listings', async () => {
  const { MAGNASOFT_CONSULTING_INDIA_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(MAGNASOFT_CONSULTING_INDIA_CATALOG)

  assert.equal(defaultCatalog, MAGNASOFT_CONSULTING_INDIA_CATALOG)
  assert.equal(provider.source, 'magnasoftconsultingindia')
  assert.equal(provider.companyName, 'Magnasoft Consulting India')
  assert.equal(provider.officialBrandName, 'Magnasoft')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.magnasoft.com/')
  assert.equal(provider.companyCareerPage, 'https://www.magnasoft.com/careers/')
  assert.equal(provider.companyDomain, 'magnasoft.com')
  assert.equal(provider.atsPlatform, 'official-first-party-careers-shell-no-public-jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-careers-shell-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-shell+no-public-job-listings+return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /magnasoftconsultingindia[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.magnasoft\.com\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
})
