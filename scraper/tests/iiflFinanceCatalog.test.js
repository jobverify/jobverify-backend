import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const iiflFinanceModulePath = path.resolve(currentDir, '../iiflfinance/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../iiflfinance/catalog.js')
  } catch {
    assert.fail('Expected IIFL Finance catalog module at ../iiflfinance/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../iiflfinance/script.js')
  } catch {
    assert.fail('Expected IIFL Finance scraper module at ../iiflfinance/script.js')
  }
}

test('IIFL Finance local catalog captures the verified first-party careers handoff to Darwinbox without alias churn', async () => {
  const { IIFL_FINANCE_CATALOG } = await loadCatalogModule()
  const iiflFinance = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(IIFL_FINANCE_CATALOG)

  assert.equal(provider.source, 'iiflfinance')
  assert.equal(provider.companyName, 'IIFL Finance')
  assert.equal(provider.officialBrandName, 'IIFL Finance')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.iifl.com/finance/career')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://iifl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    provider.officialResumeSubmissionUrl,
    'https://iifl.darwinbox.in/ms/candidate/careers/others?apply=1',
  )
  assert.equal(
    provider.publicPortalUrl,
    'https://iifl.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    provider.darwinboxListingApiUrl,
    'https://iifl.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(provider.darwinboxOrigin, 'https://iifl.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page-handoff+darwinbox-listing-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'iifl.com')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /iiflfinance[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.iifl\.com\/finance\/career/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/iifl\.darwinbox\.in\/ms\/candidate\/careers/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /Upload Resume/i)
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare/i)
  assert.equal(provider.modulePath, iiflFinanceModulePath)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'IIFL Finance'), false)

  assert.equal(iiflFinance.PROVIDER_METADATA.source, IIFL_FINANCE_CATALOG.source)
  assert.equal(iiflFinance.PROVIDER_METADATA.companyName, IIFL_FINANCE_CATALOG.companyName)
  assert.equal(
    iiflFinance.PROVIDER_METADATA.officialCareersHandoffUrl,
    IIFL_FINANCE_CATALOG.officialCareersHandoffUrl,
  )
})

test('IIFL Finance backlog row matches directly from the local catalog without alias churn', async () => {
  const { IIFL_FINANCE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'IIFL Finance\n',
    catalog: [hydrateProviderCatalogEntry(IIFL_FINANCE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['IIFL Finance', 'iiflfinance', 'IIFL Finance']],
  )
})

test('getScraperCatalog includes IIFL Finance as a verified Darwinbox provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'iiflfinance')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'IIFL Finance')
  assert.equal(provider.companyCareerPage, 'https://www.iifl.com/finance/career')
  assert.equal(provider.companyDomain, 'iifl.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.match(provider.modulePath, /iiflfinance[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable IIFL Finance scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'iiflfinance')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'iiflfinance')
  assert.equal(scraper.provider.atsPlatform, 'darwinbox')
  assert.match(scraper.dryRunFile, /iiflfinance[\\/]jobs\.json$/i)
})
