import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../quesscorp/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../quesscorp/catalog.js')
  } catch {
    assert.fail('Expected Quess Corp catalog module at ../quesscorp/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../quesscorp/script.js')
  } catch {
    assert.fail('Expected Quess Corp scraper module at ../quesscorp/script.js')
  }
}

test('Quess Corp local catalog captures the verified first-party careers handoff to Oracle Cloud', async () => {
  const { QUESS_CORP_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const quessCorp = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(QUESS_CORP_CATALOG)

  assert.equal(defaultCatalog, QUESS_CORP_CATALOG)
  assert.equal(provider.source, 'quesscorp')
  assert.equal(provider.companyName, 'Quess Corp')
  assert.equal(provider.officialBrandName, 'Quess Corp')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.quesscorp.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.quesscorp.com/')
  assert.equal(
    provider.officialJobsHandoffUrl,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions',
  )
  assert.equal(
    provider.oracleCandidateExperienceUrl,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(provider.workspaceDomain, 'fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(
    provider.listingApiBaseUrl,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    provider.detailApiBaseUrl,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    provider.publicJobsBaseUrl,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  )
  assert.equal(provider.siteNumber, 'CX_1')
  assert.equal(provider.companyDomain, 'quesscorp.com')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'offset-query')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-handoff+verified-oracle-candidate-shell+oracle-cloud-finder-api+oracle-cloud-detail-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.equal(provider.verifiedIndiaJobCount, 2421)
  assert.match(provider.dryRunFile, /quesscorp[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.quesscorp\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/fa-eumz-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /2421 India roles/i)
  assert.match(provider.verifiedSurfaceSummary, /Consultant - Recruitment \(job 12103\)/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Quess Corp'), false)

  assert.equal(quessCorp.PROVIDER_METADATA.source, QUESS_CORP_CATALOG.source)
  assert.equal(quessCorp.PROVIDER_METADATA.companyName, QUESS_CORP_CATALOG.companyName)
  assert.equal(
    quessCorp.PROVIDER_METADATA.oracleCandidateExperienceUrl,
    QUESS_CORP_CATALOG.oracleCandidateExperienceUrl,
  )
})

test('Quess Corp backlog row matches directly from the local catalog without alias churn', async () => {
  const { QUESS_CORP_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Quess Corp\n',
    catalog: [hydrateProviderCatalogEntry(QUESS_CORP_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Quess Corp', 'quesscorp', 'Quess Corp']],
  )
})

test('Quess Corp hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { QUESS_CORP_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(QUESS_CORP_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Quess Corp')
  assert.equal(provider.companyCareerPage, 'https://careers.quesscorp.com/')
  assert.equal(provider.companyDomain, 'quesscorp.com')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.match(provider.modulePath, /quesscorp[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /quesscorp[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
