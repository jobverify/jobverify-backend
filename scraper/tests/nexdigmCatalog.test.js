import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadCatalogModule = async () => {
  try {
    return await import('../nexdigm/catalog.js')
  } catch {
    assert.fail('Expected Nexdigm catalog module at ../nexdigm/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../nexdigm/script.js')
  } catch {
    assert.fail('Expected Nexdigm scraper module at ../nexdigm/script.js')
  }
}

test('Nexdigm local catalog captures the verified current-openings page, detail route, and apply handoff', async () => {
  const {
    NEXDIGM_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()
  const nexdigm = await loadScriptModule()

  assert.equal(defaultCatalog, NEXDIGM_CATALOG)
  assert.equal(NEXDIGM_CATALOG.source, 'nexdigm')
  assert.equal(NEXDIGM_CATALOG.companyName, 'Nexdigm')
  assert.equal(NEXDIGM_CATALOG.officialBrandName, 'Nexdigm')
  assert.equal(NEXDIGM_CATALOG.adapter, 'script')
  assert.equal(NEXDIGM_CATALOG.officialHomepageUrl, 'https://www.nexdigm.com/')
  assert.equal(NEXDIGM_CATALOG.companyCareerPage, 'https://www.nexdigm.com/careers/')
  assert.equal(
    NEXDIGM_CATALOG.officialCurrentOpeningsUrl,
    'https://www.nexdigm.com/careers/current-openings/',
  )
  assert.equal(
    NEXDIGM_CATALOG.officialCareerDetailsBaseUrl,
    'https://www.nexdigm.com/careers/career-details/',
  )
  assert.equal(NEXDIGM_CATALOG.officialApplyHost, 'https://gene.darwinbox.in/')
  assert.equal(NEXDIGM_CATALOG.companyDomain, 'nexdigm.com')
  assert.equal(NEXDIGM_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(NEXDIGM_CATALOG.countryFilter, 'India')
  assert.equal(
    NEXDIGM_CATALOG.paginationStrategy,
    'single-first-party-current-openings-page-plus-detail-pages',
  )
  assert.equal(
    NEXDIGM_CATALOG.extractionStrategy,
    'verified-careers-page+verified-current-openings-page+html-listings+first-party-detail-pages+darwinbox-apply-link',
  )
  assert.equal(NEXDIGM_CATALOG.parser, 'custom-script')
  assert.equal(NEXDIGM_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(NEXDIGM_CATALOG.dryRunFile, 'nexdigm/jobs.json')
  assert.equal(NEXDIGM_CATALOG.verifiedOn, '2026-07-16')
  assert.match(NEXDIGM_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.nexdigm\.com\/careers\//i)
  assert.match(
    NEXDIGM_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.nexdigm\.com\/careers\/current-openings\//i,
  )
  assert.match(
    NEXDIGM_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.nexdigm\.com\/careers\/career-details\//i,
  )
  assert.match(NEXDIGM_CATALOG.verifiedSurfaceSummary, /gene\.darwinbox\.in/i)
  assert.match(NEXDIGM_CATALOG.modulePath, /nexdigm[\\/]script\.js$/i)

  assert.equal(nexdigm.PROVIDER_METADATA.source, NEXDIGM_CATALOG.source)
  assert.equal(nexdigm.PROVIDER_METADATA.companyName, NEXDIGM_CATALOG.companyName)
  assert.equal(
    nexdigm.PROVIDER_METADATA.officialCurrentOpeningsUrl,
    NEXDIGM_CATALOG.officialCurrentOpeningsUrl,
  )
})

test('Nexdigm exact backlog row resolves directly from the local provider metadata', async () => {
  const { NEXDIGM_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Nexdigm\n',
    catalog: [NEXDIGM_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Nexdigm', 'nexdigm', 'Nexdigm']],
  )
})
