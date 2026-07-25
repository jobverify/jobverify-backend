import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadIValueCatalog = async () => {
  try {
    return await import('../ivalue/catalog.js')
  } catch {
    assert.fail('Expected iValue catalog module at ../ivalue/catalog.js')
  }
}

test('iValue catalog captures the verified official careers block state and public GreytHR jobs API metadata', async () => {
  const {
    IVALUE_CATALOG,
    default: defaultCatalog,
  } = await loadIValueCatalog()

  assert.equal(defaultCatalog, IVALUE_CATALOG)
  assert.equal(IVALUE_CATALOG.source, 'ivalue')
  assert.equal(IVALUE_CATALOG.companyName, 'iValue')
  assert.equal(IVALUE_CATALOG.officialBrandName, 'iValue Group')
  assert.equal(IVALUE_CATALOG.adapter, 'script')
  assert.equal(
    IVALUE_CATALOG.companyCareerPage,
    'https://ivaluegroup.com/en-in/careers/working-at-ivalue/',
  )
  assert.equal(IVALUE_CATALOG.companyDomain, 'ivaluegroup.com')
  assert.equal(IVALUE_CATALOG.officialHomepageUrl, 'https://ivaluegroup.com/')
  assert.equal(IVALUE_CATALOG.verifiedPublicJobsPageUrl, 'https://ivgroup.greythr.com/hire/jobs/')
  assert.equal(
    IVALUE_CATALOG.companyDetailsUrl,
    'https://ivgroup.greythr.com/hire/api/career/get_company_details/',
  )
  assert.equal(
    IVALUE_CATALOG.employmentCategoriesUrl,
    'https://ivgroup.greythr.com/hire/api/greythr/emp-category/',
  )
  assert.equal(
    IVALUE_CATALOG.jobsApiUrl,
    'https://ivgroup.greythr.com/hire/api/career/published_jobs/',
  )
  assert.equal(IVALUE_CATALOG.atsPlatform, 'greythr')
  assert.equal(IVALUE_CATALOG.countryFilter, 'India')
  assert.equal(
    IVALUE_CATALOG.paginationStrategy,
    'official-careers-block-verification-plus-greythr-published-jobs-api',
  )
  assert.equal(
    IVALUE_CATALOG.extractionStrategy,
    'verified-blocked-official-careers-pages+verified-greythr-jobs-page+greythr-company-details+greythr-location-catalog+published-jobs-api',
  )
  assert.equal(IVALUE_CATALOG.parser, 'custom-script')
  assert.equal(IVALUE_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(IVALUE_CATALOG.verifiedOn, '2026-07-16')
  assert.match(
    IVALUE_CATALOG.verifiedSurfaceSummary,
    /https:\/\/ivaluegroup\.com\/en-in\/careers\/working-at-ivalue\//i,
  )
  assert.match(
    IVALUE_CATALOG.verifiedSurfaceSummary,
    /https:\/\/ivgroup\.greythr\.com\/hire\/jobs\//i,
  )
  assert.match(
    IVALUE_CATALOG.verifiedSurfaceSummary,
    /https:\/\/ivgroup\.greythr\.com\/hire\/api\/career\/published_jobs\//i,
  )
  assert.match(IVALUE_CATALOG.verifiedSurfaceSummary, /\b36 India roles\b/i)
  assert.match(IVALUE_CATALOG.modulePath, /ivalue[\\/]script\.js$/i)
})

test('iValue backlog matching works directly from the local catalog metadata', async () => {
  const { IVALUE_CATALOG } = await loadIValueCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'iValue\n',
    catalog: [IVALUE_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['iValue', 'ivalue', 'iValue']],
  )
})
