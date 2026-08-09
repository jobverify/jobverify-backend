import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const eclerxModulePath = path.resolve(currentDir, '../../scraper/eclerx/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/eclerx/catalog.js')
  } catch {
    assert.fail('Expected eClerx catalog module at ../../scraper/eclerx/catalog.js')
  }
}

const loadEclerxModule = async () => {
  try {
    return await import('../../scraper/eclerx/script.js')
  } catch {
    assert.fail('Expected eClerx scraper module at ../../scraper/eclerx/script.js')
  }
}

test('eClerx local catalog captures the verified first-party careers pages and Oracle India jobs surface', async () => {
  const { ECLERX_CATALOG } = await loadCatalogModule()
  const eclerx = await loadEclerxModule()

  assert.equal(ECLERX_CATALOG.source, 'eclerx')
  assert.equal(ECLERX_CATALOG.companyName, 'eClerx')
  assert.equal(ECLERX_CATALOG.officialBrandName, 'eClerx')
  assert.equal(ECLERX_CATALOG.adapter, 'script')
  assert.equal(ECLERX_CATALOG.officialHomepageUrl, 'https://eclerx.com/')
  assert.equal(ECLERX_CATALOG.officialCareersLandingUrl, 'https://eclerx.com/careers/')
  assert.equal(ECLERX_CATALOG.companyCareerPage, 'https://eclerx.com/job-portal/')
  assert.equal(
    ECLERX_CATALOG.oracleCandidateExperienceUrl,
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(ECLERX_CATALOG.workspaceDomain, 'fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(
    ECLERX_CATALOG.listingApiBaseUrl,
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    ECLERX_CATALOG.detailApiBaseUrl,
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    ECLERX_CATALOG.publicJobsBaseUrl,
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  )
  assert.equal(ECLERX_CATALOG.siteNumber, 'CX_1')
  assert.equal(ECLERX_CATALOG.atsPlatform, 'oracle-cloud')
  assert.equal(ECLERX_CATALOG.countryFilter, 'India')
  assert.equal(ECLERX_CATALOG.paginationStrategy, 'offset-query-location-filter')
  assert.equal(
    ECLERX_CATALOG.extractionStrategy,
    'verified-first-party-careers-pages+oracle-cloud-candidate-experience+oracle-cloud-india-finder-api+oracle-cloud-detail-api',
  )
  assert.equal(ECLERX_CATALOG.parser, 'custom-script')
  assert.equal(ECLERX_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ECLERX_CATALOG.companyDomain, 'eclerx.com')
  assert.equal(ECLERX_CATALOG.verifiedOn, '2026-07-15')
  assert.match(ECLERX_CATALOG.dryRunFile, /eclerx[\\/]jobs\.json$/i)
  assert.equal(ECLERX_CATALOG.modulePath, eclerxModulePath)
  assert.match(ECLERX_CATALOG.verifiedSurfaceSummary, /https:\/\/eclerx\.com\/careers\//i)
  assert.match(ECLERX_CATALOG.verifiedSurfaceSummary, /https:\/\/eclerx\.com\/job-portal\//i)
  assert.match(
    ECLERX_CATALOG.verifiedSurfaceSummary,
    /https:\/\/fa-ewji-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/jobs/i,
  )
  assert.match(
    ECLERX_CATALOG.verifiedSurfaceSummary,
    /https:\/\/fa-ewji-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitions\?onlyData=true&expand=requisitionList\.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India/i,
  )
  assert.match(
    ECLERX_CATALOG.verifiedSurfaceSummary,
    /https:\/\/fa-ewji-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitionDetails\?expand=all&onlyData=true&finder=ById;Id=%2281338%22,siteNumber=CX_1/i,
  )
  assert.match(ECLERX_CATALOG.verifiedSurfaceSummary, /261 India jobs/i)
  assert.match(ECLERX_CATALOG.verifiedSurfaceSummary, /Analyst/i)
  assert.match(ECLERX_CATALOG.verifiedSurfaceSummary, /Senior Analyst/i)

  assert.equal(eclerx.PROVIDER_METADATA.source, ECLERX_CATALOG.source)
  assert.equal(eclerx.PROVIDER_METADATA.companyName, ECLERX_CATALOG.companyName)
  assert.equal(eclerx.PROVIDER_METADATA.companyCareerPage, ECLERX_CATALOG.companyCareerPage)
  assert.equal(
    eclerx.PROVIDER_METADATA.oracleCandidateExperienceUrl,
    ECLERX_CATALOG.oracleCandidateExperienceUrl,
  )
})

test('eClerx backlog row resolves directly from local provider metadata without an alias entry', async () => {
  const { ECLERX_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'eClerx\n',
    catalog: [ECLERX_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['eClerx', 'eclerx', 'eClerx']],
  )
})
