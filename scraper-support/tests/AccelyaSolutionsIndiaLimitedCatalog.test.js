import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/accelyasolutionsindialimited/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/accelyasolutionsindialimited/catalog.js')
  } catch {
    assert.fail('Expected Accelya Solutions India Limited catalog module at ../../scraper/accelyasolutionsindialimited/catalog.js')
  }
}

test('Accelya Solutions India Limited catalog captures the verified careers handoff plus Workday API failure state', async () => {
  const { ACCELYA_SOLUTIONS_INDIA_LIMITED_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ACCELYA_SOLUTIONS_INDIA_LIMITED_CATALOG)

  assert.equal(defaultCatalog, ACCELYA_SOLUTIONS_INDIA_LIMITED_CATALOG)
  assert.equal(provider.source, 'accelyasolutionsindialimited')
  assert.equal(provider.companyName, 'Accelya Solutions India Limited')
  assert.equal(provider.officialBrandName, 'Accelya')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://w3.accelya.com/')
  assert.equal(provider.companyCareerPage, 'https://w3.accelya.com/careers/')
  assert.equal(provider.officialWorkdayBoardUrl, 'https://accelya.wd103.myworkdayjobs.com/Careers')
  assert.equal(
    provider.jobsApiUrl,
    'https://accelya.wd103.myworkdayjobs.com/wday/cxs/accelya/Careers/jobs',
  )
  assert.equal(provider.companyDomain, 'w3.accelya.com')
  assert.equal(provider.atsPlatform, 'official-first-party-careers-handoff-workday-api-failure')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'careers-handoff-plus-workday-api-failure-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-page+verified-workday-handoff+verified-workday-http-400-or-500-error-payload+return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /accelyasolutionsindialimited[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /View all jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /HTTP_400 or HTTP_500/i)
  assert.match(provider.verifiedSurfaceSummary, /public Workday detail pages/i)
})
