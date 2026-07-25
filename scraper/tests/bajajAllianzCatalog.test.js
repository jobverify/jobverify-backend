import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const bajajAllianzModulePath = path.resolve(currentDir, '../bajajallianz/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../bajajallianz/catalog.js')
  } catch {
    assert.fail('Expected Bajaj Allianz catalog module at ../bajajallianz/catalog.js')
  }
}

const loadBajajAllianzModule = async () => {
  try {
    return await import('../bajajallianz/script.js')
  } catch {
    assert.fail('Expected Bajaj Allianz scraper module at ../bajajallianz/script.js')
  }
}

test('Bajaj Allianz local catalog captures the verified legacy-brand redirect and first-party nonlisting jobs shell', async () => {
  const {
    BAJAJ_ALLIANZ_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()
  const bajajAllianz = await loadBajajAllianzModule()

  assert.equal(defaultCatalog, BAJAJ_ALLIANZ_CATALOG)
  assert.equal(BAJAJ_ALLIANZ_CATALOG.source, 'bajajallianz')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.companyName, 'Bajaj Allianz')
  assert.equal(
    BAJAJ_ALLIANZ_CATALOG.officialBrandName,
    'Bajaj General Insurance (Formerly Bajaj Allianz)',
  )
  assert.equal(BAJAJ_ALLIANZ_CATALOG.legalEntityName, 'Bajaj General Insurance Limited')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.adapter, 'script')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.companyCareerPage, 'https://jobs.bajajgeneral.com/')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.homepageUrl, 'https://www.bajajallianz.com/')
  assert.equal(
    BAJAJ_ALLIANZ_CATALOG.redirectedHomepageUrl,
    'https://www.bajajgeneralinsurance.com/',
  )
  assert.equal(BAJAJ_ALLIANZ_CATALOG.jobsPortalUrl, 'https://jobs.bajajgeneral.com/')
  assert.deepEqual(BAJAJ_ALLIANZ_CATALOG.jobsPortalShellRouteUrls, [
    'https://jobs.bajajgeneral.com/',
    'https://jobs.bajajgeneral.com/bajajgeneral/search-jobs',
  ])
  assert.deepEqual(BAJAJ_ALLIANZ_CATALOG.brokenCareersRouteUrls, [
    'https://www.bajajgeneralinsurance.com/careers',
    'https://www.bajajgeneralinsurance.com/careers.html',
  ])
  assert.equal(BAJAJ_ALLIANZ_CATALOG.atsPlatform, 'official-company-careers-nonlisting')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.countryFilter, 'India')
  assert.equal(
    BAJAJ_ALLIANZ_CATALOG.paginationStrategy,
    'legacy-brand-redirect-plus-current-homepage-jobs-handoff-plus-jobs-shell-and-broken-direct-careers-route-validation',
  )
  assert.equal(
    BAJAJ_ALLIANZ_CATALOG.extractionStrategy,
    'verified-legacy-homepage-redirect+verified-current-homepage-careers-link+verified-jobs-shell-routes-without-public-listings+verified-broken-direct-careers-route-return-empty',
  )
  assert.equal(BAJAJ_ALLIANZ_CATALOG.parser, 'custom-script')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.companyDomain, 'jobs.bajajgeneral.com')
  assert.equal(BAJAJ_ALLIANZ_CATALOG.verifiedOn, '2026-07-15')
  assert.match(BAJAJ_ALLIANZ_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.bajajallianz\.com\//i)
  assert.match(
    BAJAJ_ALLIANZ_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.bajajgeneralinsurance\.com\//i,
  )
  assert.match(BAJAJ_ALLIANZ_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.bajajgeneral\.com\//i)
  assert.match(
    BAJAJ_ALLIANZ_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.bajajgeneralinsurance\.com\/careers/i,
  )
  assert.match(BAJAJ_ALLIANZ_CATALOG.verifiedSurfaceSummary, /search-jobs/i)
  assert.match(BAJAJ_ALLIANZ_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(BAJAJ_ALLIANZ_CATALOG.modulePath, bajajAllianzModulePath)

  assert.equal(bajajAllianz.PROVIDER_METADATA.source, BAJAJ_ALLIANZ_CATALOG.source)
  assert.equal(bajajAllianz.PROVIDER_METADATA.companyName, BAJAJ_ALLIANZ_CATALOG.companyName)
  assert.equal(
    bajajAllianz.PROVIDER_METADATA.companyCareerPage,
    BAJAJ_ALLIANZ_CATALOG.companyCareerPage,
  )
  assert.deepEqual(
    bajajAllianz.PROVIDER_METADATA.jobsPortalShellRouteUrls,
    BAJAJ_ALLIANZ_CATALOG.jobsPortalShellRouteUrls,
  )
})

test('Bajaj Allianz backlog matching works directly from the local catalog without an alias entry', async () => {
  const { BAJAJ_ALLIANZ_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Allianz\n',
    catalog: [BAJAJ_ALLIANZ_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Allianz', 'bajajallianz', 'Bajaj Allianz']],
  )
})

test('buildScrapers and company coverage resolve Bajaj Allianz from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajallianz')
  const scraper = buildScrapers().find((item) => item.name === 'bajajallianz')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Bajaj Allianz')
  assert.equal(provider.companyCareerPage, 'https://jobs.bajajgeneral.com/')

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Allianz\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Allianz', 'bajajallianz', 'Bajaj Allianz']],
  )
})
