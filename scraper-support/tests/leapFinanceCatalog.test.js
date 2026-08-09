import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const leapFinanceModulePath = path.resolve(currentDir, '../../scraper/leapfinance/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/leapfinance/catalog.js')
  } catch {
    assert.fail('Expected Leap Finance catalog module at ../../scraper/leapfinance/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/leapfinance/script.js')
  } catch {
    assert.fail('Expected Leap Finance scraper module at ../../scraper/leapfinance/script.js')
  }
}

test('Leap Finance local catalog captures the verified exact-name first-party jobs API surface', async () => {
  const { LEAP_FINANCE_CATALOG } = await loadCatalogModule()
  const leapFinance = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(LEAP_FINANCE_CATALOG)

  assert.equal(LEAP_FINANCE_CATALOG.source, 'leapfinance')
  assert.equal(LEAP_FINANCE_CATALOG.companyName, 'Leap Finance')
  assert.equal(LEAP_FINANCE_CATALOG.officialBrandName, 'Leap Finance')
  assert.equal(LEAP_FINANCE_CATALOG.adapter, 'script')
  assert.equal(LEAP_FINANCE_CATALOG.modulePath, leapFinanceModulePath)
  assert.equal(LEAP_FINANCE_CATALOG.dryRunFile, 'leapfinance/jobs.json')
  assert.equal(LEAP_FINANCE_CATALOG.homepageUrl, 'https://leapfinance.com/')
  assert.equal(LEAP_FINANCE_CATALOG.companyCareerPage, 'https://careers.leapfinance.com/')
  assert.equal(LEAP_FINANCE_CATALOG.publicJobsApiUrl, 'https://careers-api-eight.vercel.app/api/jobs')
  assert.equal(LEAP_FINANCE_CATALOG.companyDomain, 'leapfinance.com')
  assert.equal(LEAP_FINANCE_CATALOG.verifiedPublicJobCount, 7)
  assert.equal(LEAP_FINANCE_CATALOG.atsPlatform, 'official-company-careers-json-api')
  assert.equal(LEAP_FINANCE_CATALOG.countryFilter, 'India')
  assert.equal(
    LEAP_FINANCE_CATALOG.paginationStrategy,
    'single-first-party-careers-page-plus-live-jobs-api',
  )
  assert.equal(
    LEAP_FINANCE_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+embedded-jobs-api',
  )
  assert.equal(LEAP_FINANCE_CATALOG.parser, 'custom-script')
  assert.equal(LEAP_FINANCE_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(LEAP_FINANCE_CATALOG.verifiedOn, '2026-07-16')
  assert.match(LEAP_FINANCE_CATALOG.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(LEAP_FINANCE_CATALOG.verifiedSurfaceSummary, /https:\/\/leapfinance\.com\//i)
  assert.match(LEAP_FINANCE_CATALOG.verifiedSurfaceSummary, /https:\/\/careers\.leapfinance\.com\//i)
  assert.match(LEAP_FINANCE_CATALOG.verifiedSurfaceSummary, /careers-api-eight\.vercel\.app\/api\/jobs/i)
  assert.match(LEAP_FINANCE_CATALOG.verifiedSurfaceSummary, /7 live jobs/i)

  assert.equal(provider.source, 'leapfinance')
  assert.equal(provider.companyName, 'Leap Finance')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.leapfinance.com/')
  assert.equal(provider.companyDomain, 'leapfinance.com')
  assert.match(provider.modulePath, /leapfinance[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /leapfinance[\\/]jobs\.json$/i)

  assert.equal(leapFinance.PROVIDER_METADATA.source, provider.source)
  assert.equal(leapFinance.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(leapFinance.PROVIDER_METADATA.publicJobsApiUrl, LEAP_FINANCE_CATALOG.publicJobsApiUrl)
})

test('Leap Finance exact-name backlog rows resolve directly from local provider metadata without aliases', async () => {
  const { LEAP_FINANCE_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Leap Finance\n',
    catalog: [hydrateProviderCatalogEntry(LEAP_FINANCE_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Leap Finance', 'leapfinance', 'Leap Finance']],
  )
})
