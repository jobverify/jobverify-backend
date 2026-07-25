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

test('Sophos Technologies local catalog captures the verified first-party careers landing sentinel contract', async () => {
  const { SOPHOS_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()

  assert.equal(defaultCatalog, SOPHOS_TECHNOLOGIES_CATALOG)
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.source, 'sophostechnologies')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.companyName, 'Sophos Technologies')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.officialBrandName, 'Sophos')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.adapter, 'script')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.companyCareerPage, 'https://www.sophos.com/en-us/company/careers')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.companyDomain, 'sophos.com')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.countryFilter, 'India')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.paginationStrategy, 'verified-careers-landing-only')
  assert.equal(
    SOPHOS_TECHNOLOGIES_CATALOG.extractionStrategy,
    'verified-first-party-careers-landing+job-listings-cta-without-inline-jobs-return-empty',
  )
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.parser, 'custom-script')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.modulePath, '../sophostechnologies/script.js')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.verifiedOn, '2026-07-17')
  assert.equal(SOPHOS_TECHNOLOGIES_CATALOG.dryRunFile, 'sophostechnologies/jobs.json')
  assert.match(SOPHOS_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.sophos\.com\/en-us\/company\/careers/i)
  assert.match(SOPHOS_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /Explore our job listings/i)
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
