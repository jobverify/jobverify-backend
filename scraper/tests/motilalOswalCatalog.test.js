import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadMotilalOswalCatalog = async () => {
  try {
    return await import('../motilaloswal/catalog.js')
  } catch {
    assert.fail('Expected Motilal Oswal catalog module at ../motilaloswal/catalog.js')
  }
}

test('Motilal Oswal catalog captures the verified first-party TurboHire hiring surface', async () => {
  const {
    MOTILAL_OSWAL_CATALOG,
    default: defaultCatalog,
  } = await loadMotilalOswalCatalog()

  assert.equal(defaultCatalog, MOTILAL_OSWAL_CATALOG)
  assert.equal(MOTILAL_OSWAL_CATALOG.source, 'motilaloswal')
  assert.equal(MOTILAL_OSWAL_CATALOG.companyName, 'Motilal Oswal')
  assert.equal(MOTILAL_OSWAL_CATALOG.officialBrandName, 'Motilal Oswal Financial Services Ltd')
  assert.equal(MOTILAL_OSWAL_CATALOG.adapter, 'script')
  assert.equal(MOTILAL_OSWAL_CATALOG.homepageUrl, 'https://www.motilaloswal.com/')
  assert.equal(
    MOTILAL_OSWAL_CATALOG.companyCareerPage,
    'https://www.motilaloswal.com/careers/growth',
  )
  assert.equal(MOTILAL_OSWAL_CATALOG.companyDomain, 'motilaloswal.com')
  assert.equal(
    MOTILAL_OSWAL_CATALOG.handoffBoardUrl,
    'https://motilaloswal.turbohire.co/',
  )
  assert.equal(
    MOTILAL_OSWAL_CATALOG.turboHireOrgId,
    '0f6e3a76-85ff-4b66-8bfa-4cd4fede4ffa',
  )
  assert.equal(MOTILAL_OSWAL_CATALOG.atsPlatform, 'turbohire')
  assert.equal(MOTILAL_OSWAL_CATALOG.countryFilter, 'India')
  assert.equal(
    MOTILAL_OSWAL_CATALOG.paginationStrategy,
    'official-careers-page-handoff-plus-public-turbohire-api',
  )
  assert.equal(
    MOTILAL_OSWAL_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+verified-turbohire-board+noauth-token+filteredjobs-api',
  )
  assert.equal(MOTILAL_OSWAL_CATALOG.parser, 'custom-script')
  assert.equal(MOTILAL_OSWAL_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(MOTILAL_OSWAL_CATALOG.verifiedOn, '2026-07-16')
  assert.equal(MOTILAL_OSWAL_CATALOG.dryRunFile, 'motilaloswal/jobs.json')
  assert.match(MOTILAL_OSWAL_CATALOG.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(MOTILAL_OSWAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.motilaloswal\.com\/careers\/growth/i)
  assert.match(MOTILAL_OSWAL_CATALOG.verifiedSurfaceSummary, /https:\/\/motilaloswal\.turbohire\.co\//i)
  assert.match(MOTILAL_OSWAL_CATALOG.verifiedSurfaceSummary, /47 public jobs/i)
  assert.match(MOTILAL_OSWAL_CATALOG.modulePath, /motilaloswal[\\/]script\.js$/i)
})

test('Motilal Oswal backlog matching works directly from the local catalog metadata', async () => {
  const { MOTILAL_OSWAL_CATALOG } = await loadMotilalOswalCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'Motilal Oswal,\n',
    catalog: [MOTILAL_OSWAL_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Motilal Oswal', 'motilaloswal', 'Motilal Oswal']],
  )
})
