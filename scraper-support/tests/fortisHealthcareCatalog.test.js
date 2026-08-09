import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fortisModulePath = path.resolve(currentDir, '../../scraper/fortishealthcare/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/fortishealthcare/catalog.js')
  } catch {
    assert.fail('Expected Fortis Healthcare catalog module at ../../scraper/fortishealthcare/catalog.js')
  }
}

const loadFortisModule = async () => {
  try {
    return await import('../../scraper/fortishealthcare/script.js')
  } catch {
    assert.fail('Expected Fortis Healthcare scraper module at ../../scraper/fortishealthcare/script.js')
  }
}

test('Fortis Healthcare local catalog captures the verified first-party careers handoff to Oracle Cloud', async () => {
  const { FORTIS_HEALTHCARE_CATALOG } = await loadCatalogModule()
  const fortis = await loadFortisModule()

  assert.equal(FORTIS_HEALTHCARE_CATALOG.source, 'fortishealthcare')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.companyName, 'Fortis Healthcare')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.officialBrandName, 'Fortis Healthcare Limited')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.adapter, 'script')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.homepageUrl, 'https://www.fortishealthcare.com/')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.companyCareerPage, 'https://www.fortishealthcare.com/careers')
  assert.equal(
    FORTIS_HEALTHCARE_CATALOG.officialCareersResolvedUrl,
    'https://www.fortishealthcare.com/careers-at-Fortis-basic',
  )
  assert.equal(FORTIS_HEALTHCARE_CATALOG.companyDomain, 'fortishealthcare.com')
  assert.equal(
    FORTIS_HEALTHCARE_CATALOG.oracleCandidateExperienceUrl,
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(FORTIS_HEALTHCARE_CATALOG.workspaceDomain, 'fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(
    FORTIS_HEALTHCARE_CATALOG.listingApiBaseUrl,
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    FORTIS_HEALTHCARE_CATALOG.detailApiBaseUrl,
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    FORTIS_HEALTHCARE_CATALOG.publicJobsBaseUrl,
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  )
  assert.equal(FORTIS_HEALTHCARE_CATALOG.siteNumber, 'CX_1')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.atsPlatform, 'oracle-cloud')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.countryFilter, 'India')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.paginationStrategy, 'offset-query')
  assert.equal(
    FORTIS_HEALTHCARE_CATALOG.extractionStrategy,
    'verified-first-party-careers-handoff+verified-oracle-candidate-shell+oracle-cloud-finder-api+oracle-cloud-detail-api',
  )
  assert.equal(FORTIS_HEALTHCARE_CATALOG.parser, 'custom-script')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(FORTIS_HEALTHCARE_CATALOG.verifiedOn, '2026-07-15')
  assert.match(FORTIS_HEALTHCARE_CATALOG.dryRunFile, /fortishealthcare[\\/]jobs\.json$/i)
  assert.equal(FORTIS_HEALTHCARE_CATALOG.modulePath, fortisModulePath)
  assert.match(FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary, /July 15, 2026/i)
  assert.match(FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.fortishealthcare\.com\/careers/i)
  assert.match(
    FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.fortishealthcare\.com\/careers-at-Fortis-basic/i,
  )
  assert.match(
    FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary,
    /https:\/\/fa-ermg-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/jobs/i,
  )
  assert.match(
    FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary,
    /https:\/\/fa-ermg-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitions/i,
  )
  assert.match(FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary, /1147 India roles/i)
  assert.match(
    FORTIS_HEALTHCARE_CATALOG.verifiedSurfaceSummary,
    /Attending Consultant Anaesthesiology \(job 11751\) in Mumbai, Maharashtra, India/i,
  )

  assert.equal(fortis.PROVIDER_METADATA.source, FORTIS_HEALTHCARE_CATALOG.source)
  assert.equal(fortis.PROVIDER_METADATA.companyName, FORTIS_HEALTHCARE_CATALOG.companyName)
  assert.equal(fortis.PROVIDER_METADATA.companyCareerPage, FORTIS_HEALTHCARE_CATALOG.companyCareerPage)
})

test('Fortis Healthcare exact backlog row resolves directly from local provider metadata without aliases', async () => {
  const { FORTIS_HEALTHCARE_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Fortis Healthcare\n',
    catalog: [FORTIS_HEALTHCARE_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Fortis Healthcare', 'fortishealthcare', 'Fortis Healthcare']],
  )
})
