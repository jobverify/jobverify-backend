import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const hdfcSecuritiesModulePath = path.resolve(currentDir, '../hdfcsecurities/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../hdfcsecurities/catalog.js')
  } catch {
    assert.fail('Expected HDFC Securities catalog module at ../hdfcsecurities/catalog.js')
  }
}

test('HDFC Securities local catalog captures the verified first-party careers handoff and public Darwinbox metadata', async () => {
  const {
    HDFC_SECURITIES_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
    default: defaultCatalog,
  } = await loadCatalogModule()

  assert.equal(defaultCatalog, HDFC_SECURITIES_CATALOG)
  assert.equal(HDFC_SECURITIES_CATALOG.source, 'hdfcsecurities')
  assert.equal(HDFC_SECURITIES_CATALOG.companyName, 'HDFC Securities')
  assert.equal(HDFC_SECURITIES_CATALOG.officialBrandName, 'HDFC securities')
  assert.equal(HDFC_SECURITIES_CATALOG.adapter, 'script')
  assert.equal(HDFC_SECURITIES_CATALOG.modulePath, hdfcSecuritiesModulePath)
  assert.equal(HDFC_SECURITIES_CATALOG.dryRunFile, 'hdfcsecurities/jobs.json')
  assert.equal(HDFC_SECURITIES_CATALOG.homepageUrl, 'https://www.hdfcsec.com/')
  assert.equal(HDFC_SECURITIES_CATALOG.companyCareerPage, 'https://www.hdfcsec.com/Careers')
  assert.equal(HDFC_SECURITIES_CATALOG.companyDomain, 'hdfcsec.com')
  assert.equal(
    HDFC_SECURITIES_CATALOG.officialCareersHandoffUrl,
    'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home',
  )
  assert.equal(HDFC_SECURITIES_CATALOG.darwinboxOrigin, 'https://hdfcsecurities.darwinbox.in')
  assert.equal(HDFC_SECURITIES_CATALOG.darwinboxCompanyId, 'main')
  assert.equal(
    HDFC_SECURITIES_CATALOG.publicAllJobsUrl,
    'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    HDFC_SECURITIES_CATALOG.listingApiUrl,
    'https://hdfcsecurities.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(HDFC_SECURITIES_CATALOG.atsPlatform, 'darwinbox')
  assert.equal(HDFC_SECURITIES_CATALOG.countryFilter, 'India')
  assert.equal(
    HDFC_SECURITIES_CATALOG.paginationStrategy,
    'verified-first-party-homepage-plus-careers-page-and-darwinbox-browser-session-listing-api',
  )
  assert.equal(
    HDFC_SECURITIES_CATALOG.extractionStrategy,
    'verified-homepage+verified-careers-page+darwinbox-browser-session-listing-api',
  )
  assert.equal(HDFC_SECURITIES_CATALOG.parser, 'custom-script')
  assert.equal(HDFC_SECURITIES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(HDFC_SECURITIES_CATALOG.verifiedOn, '2026-07-16')
  assert.equal(HDFC_SECURITIES_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.hdfcsec\.com\//i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.hdfcsec\.com\/Careers/i)
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /https:\/\/hdfcsecurities\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/home/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /https:\/\/hdfcsecurities\.darwinbox\.in\/ms\/candidateapi\/job\/alljobs\?companyId=main/i,
  )
  assert.match(VERIFIED_SURFACE_SUMMARY, /\b15 public jobs\b/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /\bCloudflare 403\b/i)
})

test('HDFC Securities local catalog hydrates into coverage without needing an alias entry', async () => {
  const { HDFC_SECURITIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(HDFC_SECURITIES_CATALOG)

  assert.equal(provider.companyName, 'HDFC Securities')
  assert.equal(provider.companyDomain, 'hdfcsec.com')
  assert.match(provider.modulePath, /hdfcsecurities[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /hdfcsecurities[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'HDFC Securities\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['HDFC Securities', 'hdfcsecurities', 'HDFC Securities']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'HDFC Securities'), false)
})

test('getScraperCatalog includes HDFC Securities as a verified Darwinbox provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'hdfcsecurities')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'HDFC Securities')
  assert.equal(provider.companyCareerPage, 'https://www.hdfcsec.com/Careers')
  assert.equal(provider.companyDomain, 'hdfcsec.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.match(provider.modulePath, /hdfcsecurities[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable HDFC Securities scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'hdfcsecurities')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'hdfcsecurities')
  assert.equal(scraper.provider.atsPlatform, 'darwinbox')
  assert.match(scraper.dryRunFile, /hdfcsecurities[\\/]jobs\.json$/i)
})
