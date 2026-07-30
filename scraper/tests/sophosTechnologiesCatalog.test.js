import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadCatalogModule = async () => {
  try {
    return await import('../sophostechnologies/catalog.js')
  } catch {
    assert.fail('Expected Sophos Technologies catalog module at ../sophostechnologies/catalog.js')
  }
}

test('Sophos Technologies local catalog captures the verified first-party Lever contract', async () => {
  const { SOPHOS_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()

  assert.equal(defaultCatalog, SOPHOS_TECHNOLOGIES_CATALOG)
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.source, 'sophostechnologies')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.companyName, 'Sophos Technologies')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.officialBrandName, 'Sophos')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.adapter, 'script')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.companyCareerPage, 'https://www.sophos.com/en-us/company/careers')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.companyDomain, 'sophos.com')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.atsPlatform, 'lever')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.countryFilter, 'India')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.paginationStrategy, 'lever-skip-limit-until-short-page')
  assert.equal(
    SOPHOS_TECHNOLOGIES_CATALOG.extractionStrategy,
    'verified-first-party-careers-handoff+official-lever-postings-api+india-country-location-filter',
  )
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.parser, 'custom-script')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.modulePath, '../sophostechnologies/script.js')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.verifiedOn, '2026-07-23')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.dryRunFile, 'sophostechnologies/jobs.json')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.leverBoardUrl, 'https://jobs.lever.co/sophos')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.leverPostingsApiUrl, 'https://api.lever.co/v0/postings/sophos')
  assert.match(SOPHOS_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.sophos\.com\/en-us\/company\/careers/i)
  assert.match(SOPHOS_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.lever\.co\/sophos/i)
  assert.match(SOPHOS_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /api\.lever\.co/i)
})

test('Sophos Technologies exact backlog row resolves directly from local provider metadata', async () => {
  const { SOPHOS_TECHNOLOGIES_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Sophos Technologies\n',
    catalog: [SOPHOS_TECHNOLOGIES_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sophos Technologies', 'sophostechnologies', 'Sophos Technologies']],
  )
})
