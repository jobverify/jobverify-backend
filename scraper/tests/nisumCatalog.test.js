import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const nisumModulePath = path.resolve(currentDir, '../nisum/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../nisum/catalog.js')
  } catch {
    assert.fail('Expected Nisum catalog module at ../nisum/catalog.js')
  }
}

const loadNisumModule = async () => {
  try {
    return await import('../nisum/script.js')
  } catch {
    assert.fail('Expected Nisum scraper module at ../nisum/script.js')
  }
}

test('Nisum local catalog captures the verified first-party careers flow and CEIPAL API metadata', async () => {
  const { NISUM_CATALOG } = await loadCatalogModule()
  const nisum = await loadNisumModule()
  const provider = hydrateProviderCatalogEntry(NISUM_CATALOG)

  assert.equal(provider.source, 'nisum')
  assert.equal(provider.companyName, 'Nisum')
  assert.equal(provider.officialBrandName, 'Nisum')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.nisum.com/')
  assert.equal(provider.officialCareersLandingUrl, 'https://www.nisum.com/careers')
  assert.equal(provider.companyCareerPage, 'https://www.nisum.com/careers/careers-india')
  assert.equal(provider.ceipalWidgetScriptUrl, 'https://jobsapi.ceipal.com/APISource/widget.js')
  assert.equal(
    provider.ceipalWidgetUrl,
    'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09&cp_id=Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  )
  assert.equal(
    provider.ceipalJobPostingsApiBaseUrl,
    'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/',
  )
  assert.equal(provider.ceipalApiKey, 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09')
  assert.equal(provider.ceipalCareerPortalId, 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09')
  assert.equal(provider.atsPlatform, 'ceipal-careerapi')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-careers-flow-plus-ceipal-jobpostings-api-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-global-careers+verified-india-careers+ceipal-widget-config+careerportaljobpostings-api+india-country-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'nisum.com')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /nisum[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.nisum\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.nisum\.com\/careers\/careers-india/i)
  assert.match(provider.verifiedSurfaceSummary, /CareerPortalJobPostings/i)
  assert.match(provider.verifiedSurfaceSummary, /51 total jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /\.Net Full Stack Developer/i)
  assert.equal(provider.modulePath, nisumModulePath)

  assert.equal(nisum.PROVIDER_METADATA.source, NISUM_CATALOG.source)
  assert.equal(nisum.PROVIDER_METADATA.companyName, NISUM_CATALOG.companyName)
  assert.equal(
    nisum.PROVIDER_METADATA.ceipalJobPostingsApiBaseUrl,
    NISUM_CATALOG.ceipalJobPostingsApiBaseUrl,
  )
})
