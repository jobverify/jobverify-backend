import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/innovaldigitalsolutions/catalog.js')
  } catch {
    assert.fail('Expected Innoval Digital Solutions catalog module at ../../scraper/innovaldigitalsolutions/catalog.js')
  }
}

test('Innoval Digital Solutions local catalog captures the verified first-party recruiting teaser sentinel contract', async () => {
  const { INNOVAL_DIGITAL_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()

  assert.equal(defaultCatalog, INNOVAL_DIGITAL_SOLUTIONS_CATALOG)
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.source, 'innovaldigitalsolutions')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.companyName, 'Innoval Digital Solutions')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.officialBrandName, 'Innoval Digital Solutions')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.adapter, 'script')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.companyCareerPage, 'https://www.ivldsp.com/company/')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.companyDomain, 'ivldsp.com')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.countryFilter, 'India')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.paginationStrategy, 'verified-company-page-recruiting-teaser-only')
  assert.equal(
    INNOVAL_DIGITAL_SOLUTIONS_CATALOG.extractionStrategy,
    'verified-first-party-company-page+verified-recruiting-teaser+no-trustworthy-inline-openings-return-empty',
  )
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.parser, 'custom-script')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.modulePath, '../../scraper/innovaldigitalsolutions/script.js')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.verifiedOn, '2026-08-02')
  assert.equal(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.dryRunFile, 'innovaldigitalsolutions/jobs.json')
  assert.match(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.ivldsp\.com\/company\//i)
  assert.match(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.verifiedSurfaceSummary, /Life @ IVL/i)
  assert.match(INNOVAL_DIGITAL_SOLUTIONS_CATALOG.verifiedSurfaceSummary, /SAP BTP company overview/i)
})

test('Innoval Digital Solutions exact backlog row resolves directly from local provider metadata', async () => {
  const { INNOVAL_DIGITAL_SOLUTIONS_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Innoval Digital Solutions\n',
    catalog: [INNOVAL_DIGITAL_SOLUTIONS_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Innoval Digital Solutions', 'innovaldigitalsolutions', 'Innoval Digital Solutions']],
  )
})
