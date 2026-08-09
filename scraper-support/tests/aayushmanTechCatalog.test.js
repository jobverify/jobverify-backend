import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const aayushmanTechModulePath = path.resolve(currentDir, '../../scraper/aayushmantech/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/aayushmantech/catalog.js')
  } catch {
    assert.fail('Expected Aayushman Tech catalog module at ../../scraper/aayushmantech/catalog.js')
  }
}

const loadAayushmanTechModule = async () => {
  try {
    return await import('../../scraper/aayushmantech/script.js')
  } catch {
    assert.fail('Expected Aayushman Tech scraper module at ../../scraper/aayushmantech/script.js')
  }
}

test('Aayushman Tech local catalog captures the verified first-party no-public-jobs surface', async () => {
  const { AAYUSHMAN_TECH_CATALOG } = await loadCatalogModule()
  const aayushmanTech = await loadAayushmanTechModule()

  assert.equal(AAYUSHMAN_TECH_CATALOG.source, 'aayushmantech')
  assert.equal(AAYUSHMAN_TECH_CATALOG.companyName, 'Aayushman Tech')
  assert.equal(AAYUSHMAN_TECH_CATALOG.officialBrandName, 'Aayushman Technologies')
  assert.equal(AAYUSHMAN_TECH_CATALOG.legalEntityName, 'Aayushman Tech Services Pvt. Ltd.')
  assert.equal(AAYUSHMAN_TECH_CATALOG.adapter, 'script')
  assert.equal(AAYUSHMAN_TECH_CATALOG.companyCareerPage, 'https://www.aayushmantech.com/')
  assert.equal(AAYUSHMAN_TECH_CATALOG.companyDomain, 'aayushmantech.com')
  assert.equal(AAYUSHMAN_TECH_CATALOG.companyPageUrl, 'https://www.aayushmantech.com/company')
  assert.equal(AAYUSHMAN_TECH_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(AAYUSHMAN_TECH_CATALOG.countryFilter, 'India')
  assert.equal(
    AAYUSHMAN_TECH_CATALOG.paginationStrategy,
    'homepage-plus-company-page-plus-common-careers-route-404-validation',
  )
  assert.equal(
    AAYUSHMAN_TECH_CATALOG.extractionStrategy,
    'verified-homepage+verified-company-page+verified-missing-common-careers-routes-return-empty',
  )
  assert.equal(AAYUSHMAN_TECH_CATALOG.parser, 'custom-script')
  assert.equal(AAYUSHMAN_TECH_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(AAYUSHMAN_TECH_CATALOG.verifiedOn, '2026-07-14')
  assert.match(AAYUSHMAN_TECH_CATALOG.verifiedSurfaceSummary, /aayushmantech\.com/i)
  assert.match(AAYUSHMAN_TECH_CATALOG.verifiedSurfaceSummary, /Aayushman Technologies/i)
  assert.match(AAYUSHMAN_TECH_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(AAYUSHMAN_TECH_CATALOG.modulePath, aayushmanTechModulePath)

  assert.equal(aayushmanTech.PROVIDER_METADATA.source, AAYUSHMAN_TECH_CATALOG.source)
  assert.equal(aayushmanTech.PROVIDER_METADATA.companyName, AAYUSHMAN_TECH_CATALOG.companyName)
  assert.equal(aayushmanTech.PROVIDER_METADATA.companyCareerPage, AAYUSHMAN_TECH_CATALOG.companyCareerPage)
  assert.equal(aayushmanTech.PROVIDER_METADATA.companyPageUrl, AAYUSHMAN_TECH_CATALOG.companyPageUrl)
})

test('buildScrapers and company coverage resolve Aayushman Tech from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'aayushmantech')
  const scraper = buildScrapers().find((item) => item.name === 'aayushmantech')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Aayushman Tech')
  assert.equal(provider.companyCareerPage, 'https://www.aayushmantech.com/')
  assert.match(scraper.dryRunFile, /aayushmantech[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Aayushman Tech\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aayushman Tech', 'aayushmantech', 'Aayushman Tech']],
  )
})
