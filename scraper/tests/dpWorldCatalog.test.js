import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../dpworld/catalog.js')
  } catch {
    assert.fail('Expected DP World catalog module at ../dpworld/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../dpworld/script.js')
  } catch {
    assert.fail('Expected DP World scraper module at ../dpworld/script.js')
  }
}

test('DP World local catalog captures the verified first-party careers handoff and Oracle Cloud India contract', async () => {
  const { DP_WORLD_CATALOG } = await loadCatalogModule()
  const dpWorld = await loadScraperModule()

  assert.equal(DP_WORLD_CATALOG.source, 'dpworld')
  assert.equal(DP_WORLD_CATALOG.companyName, 'DP World')
  assert.equal(DP_WORLD_CATALOG.adapter, 'script')
  assert.equal(DP_WORLD_CATALOG.homepageUrl, 'https://www.dpworld.com/en')
  assert.equal(DP_WORLD_CATALOG.companyCareerPage, 'https://www.dpworld.com/en/careers')
  assert.equal(
    DP_WORLD_CATALOG.officialCandidateExperienceUrl,
    'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(DP_WORLD_CATALOG.workspaceDomain, 'ehpv.fa.em2.oraclecloud.com')
  assert.equal(
    DP_WORLD_CATALOG.listingApiBaseUrl,
    'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    DP_WORLD_CATALOG.detailApiBaseUrl,
    'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    DP_WORLD_CATALOG.publicJobsBaseUrl,
    'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  )
  assert.equal(DP_WORLD_CATALOG.siteNumber, 'CX_1')
  assert.equal(DP_WORLD_CATALOG.atsPlatform, 'oracle-cloud')
  assert.equal(DP_WORLD_CATALOG.countryFilter, 'India')
  assert.equal(DP_WORLD_CATALOG.paginationStrategy, 'offset-query-location-filter')
  assert.equal(
    DP_WORLD_CATALOG.extractionStrategy,
    'verified-first-party-careers-shell+oracle-cloud-candidate-experience+oracle-cloud-india-finder-api+oracle-cloud-detail-api',
  )
  assert.equal(DP_WORLD_CATALOG.parser, 'custom-script')
  assert.equal(DP_WORLD_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DP_WORLD_CATALOG.companyDomain, 'dpworld.com')
  assert.equal(DP_WORLD_CATALOG.verifiedOn, '2026-07-15')
  assert.match(DP_WORLD_CATALOG.modulePath, /dpworld[\\/]script\.js$/i)
  assert.match(DP_WORLD_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dpworld\.com\/en\/careers/i)
  assert.match(
    DP_WORLD_CATALOG.verifiedSurfaceSummary,
    /https:\/\/ehpv\.fa\.em2\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/jobs/i,
  )
  assert.match(
    DP_WORLD_CATALOG.verifiedSurfaceSummary,
    /https:\/\/ehpv\.fa\.em2\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitions\?onlyData=true&expand=requisitionList\.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India/i,
  )
  assert.match(
    DP_WORLD_CATALOG.verifiedSurfaceSummary,
    /https:\/\/ehpv\.fa\.em2\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitionDetails\?expand=all&onlyData=true&finder=ById;Id=%2224391%22,siteNumber=CX_1/i,
  )

  assert.equal(dpWorld.PROVIDER_METADATA.source, DP_WORLD_CATALOG.source)
  assert.equal(dpWorld.PROVIDER_METADATA.companyName, DP_WORLD_CATALOG.companyName)
  assert.equal(dpWorld.PROVIDER_METADATA.companyCareerPage, DP_WORLD_CATALOG.companyCareerPage)
  assert.equal(
    dpWorld.PROVIDER_METADATA.officialCandidateExperienceUrl,
    DP_WORLD_CATALOG.officialCandidateExperienceUrl,
  )
})

test('DP World backlog row resolves directly from local provider metadata without an alias entry', async () => {
  const { DP_WORLD_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'DP World\n',
    catalog: [DP_WORLD_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DP World', 'dpworld', 'DP World']],
  )
})

test('buildScrapers and company coverage resolve DP World from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dpworld')
  const scraper = buildScrapers().find((item) => item.name === 'dpworld')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'DP World')
  assert.equal(provider.companyCareerPage, 'https://www.dpworld.com/en/careers')
  assert.match(scraper.dryRunFile, /dpworld[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'DP World\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DP World', 'dpworld', 'DP World']],
  )
})
