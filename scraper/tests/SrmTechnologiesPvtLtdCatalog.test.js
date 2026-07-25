import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../srmtechnologiespvtltd/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../srmtechnologiespvtltd/catalog.js')
  } catch {
    assert.fail('Expected SRM Technologies Pvt.Ltd catalog module at ../srmtechnologiespvtltd/catalog.js')
  }
}

test('SRM Technologies Pvt.Ltd catalog captures the verified login-gated first-party candidate portal', async () => {
  const { SRM_TECHNOLOGIES_PVT_LTD_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SRM_TECHNOLOGIES_PVT_LTD_CATALOG)

  assert.equal(defaultCatalog, SRM_TECHNOLOGIES_PVT_LTD_CATALOG)
  assert.equal(provider.source, 'srmtechnologiespvtltd')
  assert.equal(provider.companyName, 'SRM Technologies Pvt.Ltd')
  assert.equal(provider.officialBrandName, 'SRM Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.srmtech.com/')
  assert.equal(provider.companyCareerPage, 'https://www.srmtech.com/')
  assert.equal(provider.candidatePortalUrl, 'https://careers.srmtech.com/candidateportal')
  assert.equal(provider.companyDomain, 'srmtech.com')
  assert.equal(provider.atsPlatform, 'official-first-party-handoff-login-gated-candidate-portal')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-handoff-plus-login-gated-portal-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-open-positions-handoff+verified-login-gated-candidateportal+return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /srmtechnologiespvtltd[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Open Positions/i)
  assert.match(provider.verifiedSurfaceSummary, /Candidate Portal/i)
  assert.match(provider.verifiedSurfaceSummary, /TOTP/i)
})
