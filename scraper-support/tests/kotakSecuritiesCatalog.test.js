import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const kotakSecuritiesModulePath = path.resolve(currentDir, '../../scraper/kotaksecurities/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/kotaksecurities/catalog.js')
  } catch {
    assert.fail('Expected Kotak Securities catalog module at ../../scraper/kotaksecurities/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/kotaksecurities/script.js')
  } catch {
    assert.fail('Expected Kotak Securities scraper module at ../../scraper/kotaksecurities/script.js')
  }
}

test('Kotak Securities local catalog captures the verified first-party Darwinbox careers surface', async () => {
  const { KOTAK_SECURITIES_CATALOG } = await loadCatalogModule()
  const kotakSecurities = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(KOTAK_SECURITIES_CATALOG)

  assert.equal(KOTAK_SECURITIES_CATALOG.source, 'kotaksecurities')
  assert.equal(KOTAK_SECURITIES_CATALOG.companyName, 'Kotak Securities')
  assert.equal(KOTAK_SECURITIES_CATALOG.officialBrandName, 'Kotak Securities')
  assert.equal(KOTAK_SECURITIES_CATALOG.adapter, 'script')
  assert.equal(KOTAK_SECURITIES_CATALOG.modulePath, kotakSecuritiesModulePath)
  assert.equal(KOTAK_SECURITIES_CATALOG.dryRunFile, 'kotaksecurities/jobs.json')
  assert.equal(KOTAK_SECURITIES_CATALOG.homepageUrl, 'https://www.kotaksecurities.com/')
  assert.equal(KOTAK_SECURITIES_CATALOG.verifiedBrandHomepageRedirectUrl, 'https://www.kotakneo.com/')
  assert.equal(
    KOTAK_SECURITIES_CATALOG.companyCareerPage,
    'https://www.kotakneo.com/about-us/careers/',
  )
  assert.equal(
    KOTAK_SECURITIES_CATALOG.officialCareersHandoffUrl,
    'https://kotaksecurities.darwinbox.in/ms/candidate/careers/',
  )
  assert.equal(KOTAK_SECURITIES_CATALOG.darwinboxOrigin, 'https://kotaksecurities.darwinbox.in')
  assert.equal(KOTAK_SECURITIES_CATALOG.darwinboxCompanyId, 'main')
  assert.equal(KOTAK_SECURITIES_CATALOG.companyDomain, 'kotaksecurities.com')
  assert.equal(KOTAK_SECURITIES_CATALOG.atsPlatform, 'darwinbox')
  assert.equal(KOTAK_SECURITIES_CATALOG.countryFilter, 'India')
  assert.equal(
    KOTAK_SECURITIES_CATALOG.paginationStrategy,
    'browser-session-darwinbox-pagination',
  )
  assert.equal(
    KOTAK_SECURITIES_CATALOG.extractionStrategy,
    'official-careers-page+darwinbox-listing-api',
  )
  assert.equal(KOTAK_SECURITIES_CATALOG.parser, 'custom-script')
  assert.equal(KOTAK_SECURITIES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(KOTAK_SECURITIES_CATALOG.verifiedOn, '2026-07-16')
  assert.match(KOTAK_SECURITIES_CATALOG.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(KOTAK_SECURITIES_CATALOG.verifiedSurfaceSummary, /kotaksecurities\.com/i)
  assert.match(KOTAK_SECURITIES_CATALOG.verifiedSurfaceSummary, /kotakneo\.com\/about-us\/careers/i)
  assert.match(KOTAK_SECURITIES_CATALOG.verifiedSurfaceSummary, /darwinbox/i)

  assert.equal(provider.source, 'kotaksecurities')
  assert.equal(provider.companyName, 'Kotak Securities')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.kotakneo.com/about-us/careers/')
  assert.equal(provider.companyDomain, 'kotaksecurities.com')
  assert.match(provider.modulePath, /kotaksecurities[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /kotaksecurities[\\/]jobs\.json$/i)

  assert.equal(kotakSecurities.PROVIDER_METADATA.source, provider.source)
  assert.equal(kotakSecurities.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(
    kotakSecurities.PROVIDER_METADATA.officialCareersHandoffUrl,
    KOTAK_SECURITIES_CATALOG.officialCareersHandoffUrl,
  )
})

test('Kotak Securities exact-name backlog rows resolve directly from local provider metadata without aliases', async () => {
  const { KOTAK_SECURITIES_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Kotak Securities\n',
    catalog: [hydrateProviderCatalogEntry(KOTAK_SECURITIES_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Kotak Securities', 'kotaksecurities', 'Kotak Securities']],
  )
})
