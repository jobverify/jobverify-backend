import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const nationalInstrumentsModulePath = path.resolve(currentDir, '../../scraper/nationalinstruments/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/nationalinstruments/catalog.js')
  } catch {
    assert.fail('Expected National Instruments catalog module at ../../scraper/nationalinstruments/catalog.js')
  }
}

const loadNationalInstrumentsModule = async () => {
  try {
    return await import('../../scraper/nationalinstruments/script.js')
  } catch {
    assert.fail('Expected National Instruments scraper module at ../../scraper/nationalinstruments/script.js')
  }
}

test('National Instruments local catalog captures the verified NI careers handoff and linked Oracle outage', async () => {
  const { NATIONAL_INSTRUMENTS_CATALOG } = await loadCatalogModule()
  const nationalInstruments = await loadNationalInstrumentsModule()

  assert.deepEqual(NATIONAL_INSTRUMENTS_CATALOG, {
    source: 'nationalinstruments',
    companyName: 'National Instruments',
    officialBrandName: 'NI',
    adapter: 'script',
    modulePath: nationalInstrumentsModulePath,
    homepageUrl: 'https://www.ni.com/',
    companyCareerPage: 'https://www.ni.com/en/about-ni/careers.html',
    companyDomain: 'ni.com',
    oracleCandidateExperienceUrl:
      'https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions',
    oracleCandidateExperienceRootUrl:
      'https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1',
    listingApiUrl:
      'https://pef.fa.us1.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India',
    acceptedCareerPageStatuses: [503],
    atsPlatform: 'official-company-careers-unavailable',
    countryFilter: 'India',
    paginationStrategy: 'official-careers-page-plus-linked-oracle-unavailable-validation',
    extractionStrategy: 'verified-first-party-careers-page+linked-oracle-503-return-empty',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    verifiedOn: '2026-07-16',
    verifiedSurfaceSummary:
      'Verified on Thursday, July 16, 2026 that https://www.ni.com/en/about-ni/careers.html is the live first-party NI careers page, that it publicly links candidates to the Oracle Candidate Experience requisitions page at https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions, and that the linked Oracle requisitions page, board root, and public requisitions API each returned HTTP 503 Service Unavailable responses from the public surface during verification. The scraper therefore returns an empty array until the linked public jobs board recovers.',
  })

  assert.equal(nationalInstruments.PROVIDER_METADATA.source, NATIONAL_INSTRUMENTS_CATALOG.source)
  assert.equal(
    nationalInstruments.PROVIDER_METADATA.companyCareerPage,
    NATIONAL_INSTRUMENTS_CATALOG.companyCareerPage,
  )
  assert.equal(
    nationalInstruments.PROVIDER_METADATA.oracleCandidateExperienceUrl,
    NATIONAL_INSTRUMENTS_CATALOG.oracleCandidateExperienceUrl,
  )
})

test('National Instruments exact backlog row resolves directly from the local provider metadata without aliases', async () => {
  const { NATIONAL_INSTRUMENTS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'National Instruments\n',
    catalog: [NATIONAL_INSTRUMENTS_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['National Instruments', 'nationalinstruments', 'National Instruments']],
  )
})

test('getScraperCatalog includes National Instruments as a verified linked-board unavailable sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'nationalinstruments')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'National Instruments')
  assert.equal(provider.companyCareerPage, 'https://www.ni.com/en/about-ni/careers.html')
  assert.equal(provider.companyDomain, 'ni.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-unavailable')
  assert.match(provider.modulePath, /nationalinstruments[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable National Instruments scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'nationalinstruments')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'nationalinstruments')
  assert.equal(scraper.provider.atsPlatform, 'official-company-careers-unavailable')
  assert.match(scraper.dryRunFile, /nationalinstruments[\\/]jobs\.json$/i)
})
