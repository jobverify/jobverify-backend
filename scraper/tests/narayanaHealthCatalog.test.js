import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadCatalogModule = async () => {
  try {
    return await import('../narayanahealth/catalog.js')
  } catch {
    assert.fail('Expected Narayana Health catalog module at ../narayanahealth/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../narayanahealth/script.js')
  } catch {
    assert.fail('Expected Narayana Health scraper module at ../narayanahealth/script.js')
  }
}

test('Narayana Health local catalog captures the verified first-party SAP jobs board contract', async () => {
  const {
    NARAYANA_HEALTH_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()
  const narayanaHealth = await loadScriptModule()

  assert.equal(defaultCatalog, NARAYANA_HEALTH_CATALOG)
  assert.equal(NARAYANA_HEALTH_CATALOG.source, 'narayanahealth')
  assert.equal(NARAYANA_HEALTH_CATALOG.companyName, 'Narayana Health')
  assert.equal(NARAYANA_HEALTH_CATALOG.officialBrandName, 'Narayana Health')
  assert.equal(NARAYANA_HEALTH_CATALOG.adapter, 'script')
  assert.equal(NARAYANA_HEALTH_CATALOG.siteMapUrl, 'https://www.narayanahealth.org/sitemap')
  assert.equal(NARAYANA_HEALTH_CATALOG.companyCareerPage, 'https://jobs.narayanahealth.org/?locale=en_GB')
  assert.equal(
    NARAYANA_HEALTH_CATALOG.officialCareersHandoffUrl,
    'https://jobs.narayanahealth.org/viewalljobs/',
  )
  assert.equal(NARAYANA_HEALTH_CATALOG.companyDomain, 'narayanahealth.org')
  assert.equal(NARAYANA_HEALTH_CATALOG.atsPlatform, 'successfactors')
  assert.equal(NARAYANA_HEALTH_CATALOG.countryFilter, 'India')
  assert.equal(NARAYANA_HEALTH_CATALOG.paginationStrategy, 'category-discovery+offset-path')
  assert.equal(
    NARAYANA_HEALTH_CATALOG.extractionStrategy,
    'first-party-sitemap-careers-link+jobs2web-view-all-categories+html-category-rows+detail-pages+filled-role-fallback',
  )
  assert.equal(NARAYANA_HEALTH_CATALOG.parser, 'custom-script')
  assert.equal(NARAYANA_HEALTH_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(NARAYANA_HEALTH_CATALOG.dryRunFile, 'narayanahealth/jobs.json')
  assert.equal(NARAYANA_HEALTH_CATALOG.verifiedOn, '2026-07-16')
  assert.match(NARAYANA_HEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.narayanahealth\.org\/sitemap/i)
  assert.match(NARAYANA_HEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.narayanahealth\.org\/\?locale=en_GB/i)
  assert.match(NARAYANA_HEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.narayanahealth\.org\/viewalljobs\//i)
  assert.match(NARAYANA_HEALTH_CATALOG.verifiedSurfaceSummary, /Medical Professionals/i)
  assert.match(NARAYANA_HEALTH_CATALOG.modulePath, /narayanahealth[\\/]script\.js$/i)

  assert.equal(narayanaHealth.PROVIDER_METADATA.source, NARAYANA_HEALTH_CATALOG.source)
  assert.equal(narayanaHealth.PROVIDER_METADATA.companyName, NARAYANA_HEALTH_CATALOG.companyName)
  assert.equal(
    narayanaHealth.PROVIDER_METADATA.officialCareersHandoffUrl,
    NARAYANA_HEALTH_CATALOG.officialCareersHandoffUrl,
  )
})

test('Narayana Health exact backlog row resolves directly from the local provider metadata', async () => {
  const { NARAYANA_HEALTH_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Narayana Health\n',
    catalog: [NARAYANA_HEALTH_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Narayana Health', 'narayanahealth', 'Narayana Health']],
  )
})
